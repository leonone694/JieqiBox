import { ref, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';

export interface EngineLine { text: string; kind: 'sent' | 'recv' }

// function dbg(tag: string, ...m: any[]) { console.log('[UCI]', tag, ...m) }

export function useUciEngine(generateFen: () => string) {
  const engineOutput = ref<EngineLine[]>([]);
  const isEngineLoaded = ref(false);
  const bestMove = ref('');
  const analysis = ref('');
  const isThinking = ref(false);
  const pvMoves = ref<string[]>([]);          // Real-time PV
  const uciOptionsText = ref(''); // cache UCI options raw text
  const currentEnginePath = ref(''); // current engine path

  let unlisten: (() => void) | null = null;

  /* ---------- Load Engine ---------- */
  const loadEngine = async () => {
    try {
      const path = await open({ multiple: false, title: '选择UCI引擎' });
      if (typeof path === 'string' && path) {
        engineOutput.value = []; bestMove.value = ''; analysis.value = ''; pvMoves.value = [];
        currentEnginePath.value = path; // Store engine path
        await invoke('spawn_engine', { path });
        isEngineLoaded.value = true;
        send('uci');
        
        // Automatically apply saved configuration after engine loads
        setTimeout(() => {
          applySavedSettings();
        }, 500);
      }
    } catch(e) { alert('Failed to load engine'); console.error(e) }
  };

  /* ---------- Basic Send ---------- */
  const send = (cmd: string) => { if(!isEngineLoaded.value) return;
    engineOutput.value.push({text: cmd, kind: 'sent'}); invoke('send_to_engine', { command: cmd }) };

  /* ---------- Start Analysis ---------- */
  const startAnalysis = (settings: any = {}, moves: string[] = []) => {
    if(!isEngineLoaded.value || isThinking.value) return;
    
    // Default settings
    const defaultSettings = {
      movetime: 1000,
      maxDepth: 20,
      maxNodes: 1000000,
      analysisMode: 'movetime'
    };
    
    const finalSettings = { ...defaultSettings, ...settings };
    
    console.log('UCI Engine: Start Analysis', {
      InputSettings: settings,
      DefaultSettings: defaultSettings,
      FinalSettings: finalSettings
    });
    
    const fen = generateFen();
    const pos = `position fen ${fen}${moves.length ? ' moves ' + moves.join(' ') : ''}`;
    isThinking.value = true; 
    bestMove.value = ''; 
    pvMoves.value = []; 
    analysis.value = '思考中…';
    
    send(pos);
    
    // Send different go commands based on analysis mode
    switch (finalSettings.analysisMode) {
      case 'depth':
        send(`go depth ${finalSettings.maxDepth}`);
        break;
      case 'nodes':
        send(`go nodes ${finalSettings.maxNodes}`);
        break;
      case 'movetime':
      default:
        send(`go movetime ${finalSettings.movetime}`);
        break;
    }
  };

  /* ---------- Stop Analysis ---------- */
  const stopAnalysis = () => {
    if(!isEngineLoaded.value || !isThinking.value) return;
    
    send('stop');
    isThinking.value = false;
    analysis.value = '分析已停止';
  };



  /* ---------- Apply Saved Settings ---------- */
  const applySavedSettings = () => {
    if (!isEngineLoaded.value || !currentEnginePath.value) return;
    
    // Apply analysis settings
    const analysisSettings = localStorage.getItem('analysis-settings');
    if (analysisSettings) {
      console.log('应用保存的分析设置:', analysisSettings);
    }
    
    // Apply UCI options settings
    const enginePathHash = btoa(currentEnginePath.value).replace(/[^a-zA-Z0-9]/g, '');
    const uciOptionsKey = `uci-options-${enginePathHash}`;
    const savedUciOptions = localStorage.getItem(uciOptionsKey);
    
    if (savedUciOptions) {
      console.log('应用保存的UCI选项:', savedUciOptions);
      try {
        const options = JSON.parse(savedUciOptions);
        Object.entries(options).forEach(([name, value]) => {
          const command = `setoption name ${name} value ${value}`;
          send(command);
          console.log('应用UCI选项:', command);
        });
      } catch (e) {
        console.error('解析保存的UCI选项失败:', e);
      }
    }
  };

  /* ---------- Listen to Output ---------- */
  onMounted(async() => {
    unlisten = await listen<string>('engine-output', (ev) => {
      const ln = ev.payload; engineOutput.value.push({text: ln, kind: 'recv'});

      /* --- Extract PV (using indexOf is more robust than regex) --- */
      const idx = ln.indexOf(' pv ');
      if(idx !== -1) {
        const mvStr = ln.slice(idx + 4).trim();           // 4 = ' pv '.length
        pvMoves.value = mvStr.split(/\s+/);           // Update in real-time
      }
      if(ln.startsWith('info') && ln.includes('score')) analysis.value = ln;

      if(ln.startsWith('bestmove')) {
        const mv = ln.split(' ')[1] ?? ''; 
        console.log('Engine output bestmove:', ln, 'Parsed move:', mv, 'Length:', mv.length);
        
        // Check if it's a checkmate situation (none) - use trim() to remove possible spaces
        const trimmedMv = mv.trim();
        if(trimmedMv === '(none)' || trimmedMv === 'none') {
          console.log('检测到绝杀情况:', trimmedMv);
          analysis.value = '绝杀！无着可走';
          send('stop');
        } else {
          analysis.value = mv ? `最佳着法: ${mv}` : '无着可走';
        }
        
        bestMove.value = mv; // Set bestMove
        
        // Stop thinking state
        isThinking.value = false; 
        pvMoves.value = [];
      }
      if(ln === 'uciok') send('isready');
      if(ln === 'readyok') analysis.value = '引擎已就绪';

      // record UCI options
      if (ln.startsWith('option name ')) {
        uciOptionsText.value += ln + '\n';
      }
    });
  });
  onUnmounted(() => unlisten?.());

  return { 
    engineOutput, isEngineLoaded, bestMove, analysis, isThinking, pvMoves, 
    loadEngine, startAnalysis, stopAnalysis, uciOptionsText, send, currentEnginePath, applySavedSettings 
  };
}

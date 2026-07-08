import { robotPresets, RobotPresetId } from "@/lib/robots";
import { DemoScenario } from "@/lib/types";

type InputPanelProps = {
 scenario:DemoScenario; scenarios:DemoScenario[]; goal:string; setGoal:(v:string)=>void;
 code:string; setCode:(v:string)=>void; onScenario:(id:string)=>void; onRun:()=>void;
 running:boolean; onAnalyze:()=>void; canAnalyze:boolean; robotId:RobotPresetId;
 onRobot:(id:RobotPresetId)=>void; robotWidth:number; robotLength:number;
 setRobotWidth:(value:number)=>void; setRobotLength:(value:number)=>void;
};

export function InputPanel({scenario,scenarios,goal,setGoal,code,setCode,onScenario,onRun,running,onAnalyze,canAnalyze,robotId,onRobot,robotWidth,robotLength,setRobotWidth,setRobotLength}:InputPanelProps){
 return <aside className="input-panel panel">
  <div className="panel-head input-panel-head"><div><h2>Simulation setup</h2><p>Configure the routine and virtual robot.</p></div></div>

  <section className="setup-section scenario-section">
   <label className="form-label">Scenario</label>
   <div className="select-wrap"><select value={scenario.id} onChange={e=>onScenario(e.target.value)}>{scenarios.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select><span>⌄</span></div>
   <div className="scenario-note"><span>{scenario.category}</span><p>{scenario.summary}</p></div>
  </section>

  <section className="setup-section goal-section">
   <label className="form-label" htmlFor="goal">Robot goal</label>
   <textarea id="goal" className="goal-input" value={goal} onChange={e=>setGoal(e.target.value)}/>
  </section>

  <section className="setup-section code-section">
   <div className="input-label-row"><label className="form-label" htmlFor="code">Routine code</label><span>SIMPLIFIED JAVA</span></div>
   <textarea id="code" spellCheck={false} className="code-input" value={code} onChange={e=>setCode(e.target.value)}/>
  </section>

  <section className="setup-section robot-configurator">
   <div className="config-title"><div><label className="form-label">Robot preset</label><p>Select a starting configuration.</p></div></div>
   <div className="select-wrap robot-select"><select value={robotId} onChange={e=>onRobot(e.target.value as RobotPresetId)}>{robotPresets.map(robot=><option key={robot.id} value={robot.id}>{robot.name} — {robot.width} × {robot.length} in</option>)}</select><span>⌄</span></div>
   <div className={`preset-summary ${robotPresets.find(robot=>robot.id===robotId)?.accent}`}><i/><span>{robotPresets.find(robot=>robot.id===robotId)?.description}</span></div>
   <div className="dimension-controls">
    <label><span>Width</span><div><input aria-label="Robot width" type="number" min="8" max="18" step="0.5" value={robotWidth} onChange={e=>setRobotWidth(Math.min(18,Math.max(8,Number(e.target.value))))}/><b>in</b></div></label>
    <label><span>Length</span><div><input aria-label="Robot length" type="number" min="8" max="18" step="0.5" value={robotLength} onChange={e=>setRobotLength(Math.min(18,Math.max(8,Number(e.target.value))))}/><b>in</b></div></label>
   </div>
   <button type="button" className="cad-button" disabled><span>＋</span> Import CAD <small>Coming later</small></button>
  </section>

  <div className="input-actions"><button className="button run-button" onClick={onRun} disabled={running}><span>{running?"■":"▶"}</span>{running?"Simulation running…":"Run simulation"}</button><button className="button analyze-button" disabled={!canAnalyze||running} onClick={onAnalyze}><span>✦</span> Analyze results</button>{!canAnalyze&&!running&&<p className="action-hint">Run the simulation to unlock analysis.</p>}</div>
 </aside>
}

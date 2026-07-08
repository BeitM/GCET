"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { scenarios } from "@/lib/scenarios";
import { generateFrames } from "@/lib/simulation";
import { AIFeedback, ScenarioId, TelemetryFrame } from "@/lib/types";
import { InputPanel } from "@/components/InputPanel";
import { FieldSimulator } from "@/components/FieldSimulator";
import { TelemetryPanel } from "@/components/TelemetryPanel";
import { AIFeedbackPanel } from "@/components/AIFeedbackPanel";
import { robotPresets, RobotPresetId } from "@/lib/robots";

export default function SimulatorDashboard(){
 const [scenarioId,setScenarioId]=useState<ScenarioId>("shooter"); const scenario=scenarios.find(s=>s.id===scenarioId)!;
 const [goal,setGoal]=useState(scenario.goal),[code,setCode]=useState(scenario.code);
 const [robotId,setRobotId]=useState<RobotPresetId>("launcher"),[robotWidth,setRobotWidth]=useState(18),[robotLength,setRobotLength]=useState(18);
 const frames=useMemo(()=>generateFrames(scenarioId),[scenarioId]); const [index,setIndex]=useState(0),[running,setRunning]=useState(false),[hasRun,setHasRun]=useState(false),[analysis,setAnalysis]=useState<AIFeedback|null>(null); const timer=useRef<ReturnType<typeof setInterval>|null>(null);
 const frame=frames[index]||frames[0]; const events=frames.slice(0,index+1).filter(f=>f.event||f.warning);
 useEffect(()=>()=>{if(timer.current)clearInterval(timer.current)},[]);
 const selectRobot=(id:RobotPresetId)=>{const robot=robotPresets.find(item=>item.id===id)!;setRobotId(id);setRobotWidth(robot.width);setRobotLength(robot.length)};
 const stopPlayback=()=>{if(timer.current)clearInterval(timer.current);timer.current=null;setRunning(false)};
 const playFrom=(startIndex:number)=>{if(timer.current)clearInterval(timer.current);const lastIndex=frames.length-1;let i=Math.min(startIndex,lastIndex);setIndex(i);setRunning(true);timer.current=setInterval(()=>{i++;setIndex(i);if(i>=lastIndex){if(timer.current)clearInterval(timer.current);timer.current=null;setRunning(false);setHasRun(true)}},90)};
 const choose=(id:string)=>{const next=scenarios.find(s=>s.id===id)!;const nextRobot:RobotPresetId=id==="arm"?"arm":id==="intake"?"intake":"launcher";setScenarioId(id as ScenarioId);setGoal(next.goal);setCode(next.code);selectRobot(nextRobot);setIndex(0);setHasRun(false);setAnalysis(null);stopPlayback()};
 const run=()=>{setAnalysis(null);setHasRun(false);playFrom(0)};
 const togglePlayback=()=>{if(running){stopPlayback();return}playFrom(index>=frames.length-1?0:index)};
 const seek=(nextIndex:number)=>{stopPlayback();setIndex(nextIndex)};
 const analyze=async()=>{const res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({scenarioId,goal,telemetry:frames})});setAnalysis(await res.json());setTimeout(()=>document.getElementById("analysis")?.scrollIntoView({behavior:"smooth",block:"start"}),50)};
 return <main className="sim-shell"><header className="sim-nav"><Link href="/" className="brand"><span className="brand-mark">R</span><span>RoboLab <b>FTC</b></span></Link><div className="sim-title"><span>SIMULATOR</span><i/>{robotPresets.find(robot=>robot.id===robotId)?.name}</div><div className="sim-nav-right"><span><i className="live-dot"/>SIMULATOR READY</span><Link href="/">Exit lab ×</Link></div></header>
  <div className="sim-layout"><InputPanel {...{scenario,scenarios,goal,setGoal,code,setCode,running,robotId,robotWidth,robotLength,setRobotWidth,setRobotLength}} onRobot={selectRobot} onScenario={choose} onRun={run} onAnalyze={analyze} canAnalyze={hasRun}/><div className="workspace"><div className="field-row"><FieldSimulator frame={frame} trail={frames.slice(0,index+1)} running={running} robotWidth={robotWidth} robotLength={robotLength} showPlayback={hasRun} frameIndex={index} totalFrames={frames.length} duration={frames.at(-1)?.time||0} onSeek={seek} onTogglePlayback={togglePlayback}/><TelemetryPanel frame={frame} events={events} progress={index/60*100}/></div>{(hasRun||analysis)&&<div id="analysis"><AIFeedbackPanel data={analysis} scenario={scenario.label} goal={goal}/></div>}</div></div>
 </main>
}

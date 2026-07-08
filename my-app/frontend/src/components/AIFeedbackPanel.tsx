import { useState } from "react";
import { AIFeedback } from "@/lib/types";

export function AIFeedbackPanel({data,scenario,goal}:{data:AIFeedback|null;scenario:string;goal:string}){
 const [copied,setCopied]=useState(false),[rating,setRating]=useState<"up"|"down"|null>(null);
 if(!data)return <section className="ai-panel panel ai-empty"><div className="ai-orb">✦</div><span className="kicker">AI MENTOR</span><h2>Ready when you are.</h2><p>Run the routine, then analyze the telemetry for evidence-based debugging and optimization feedback.</p></section>;
 const report=`ROBOLAB FTC DEBUG REPORT\nScenario: ${scenario}\nGoal: ${goal}\n\n${data.headline}\n\nWHAT HAPPENED\n${data.happened}\n\nLIKELY CAUSE\n${data.cause}\n\nEVIDENCE\n- ${data.evidence.join("\n- ")}\n\nSUGGESTED FIX\n${data.fix}\n\nOPTIMIZATION\n${data.optimization}`;
 const copy=async()=>{await navigator.clipboard.writeText(report);setCopied(true);setTimeout(()=>setCopied(false),1600)};
 return <section className="ai-panel panel"><div className="panel-head"><div><span className="kicker">✦ AI MENTOR ANALYSIS</span><h2>{data.headline}</h2></div><span className={`analysis-status ${data.status}`}>{data.status==="warning"?"ACTION NEEDED":"MISSION COMPLETE"}</span></div>
  <div className="feedback-lead"><span>WHAT HAPPENED</span><p>{data.happened}</p></div>
  <div className="feedback-grid"><article><span>LIKELY CAUSE</span><p>{data.cause}</p></article><article className="evidence"><span>TELEMETRY EVIDENCE</span><ul>{data.evidence.map(e=><li key={e}>{e}</li>)}</ul></article><article className="fix"><span>SUGGESTED FIX</span><p>{data.fix}</p></article><article><span>OPTIMIZATION IDEA</span><p>{data.optimization}</p></article></div>
  <div className="concept"><b>CONCEPT // WHY THIS WORKS</b><p>{data.concept}</p></div>
  <div className="report-tools"><button onClick={copy}>{copied?"✓ Report copied":"▣ Copy debug report"}</button><div><span>Was this feedback helpful?</span><button className={rating==="up"?"selected":""} onClick={()=>setRating("up")}>↑</button><button className={rating==="down"?"selected":""} onClick={()=>setRating("down")}>↓</button></div></div>
 </section>
}

import { TelemetryFrame } from "@/lib/types";

const Metric=({label,value,detail,accent}:{label:string;value:string;detail?:string;accent?:string})=><div className="metric"><span>{label}</span><strong className={accent}>{value}</strong>{detail&&<small>{detail}</small>}</div>;

export function TelemetryPanel({frame,events,progress}:{frame:TelemetryFrame;events:TelemetryFrame[];progress:number}){
 const subsystem = frame.shooterTarget > 0
  ? { label:"Launcher", value:`${Math.round(frame.shooterRpm).toLocaleString()} RPM`, detail:`Target ${frame.shooterTarget.toLocaleString()} RPM`, accent:frame.feeder&&frame.shooterRpm<frame.shooterTarget*.95?"warn":"" }
  : frame.armTarget > 0
  ? { label:"Arm", value:`${Math.round(frame.armPosition).toLocaleString()} ticks`, detail:`Target ${frame.armTarget.toLocaleString()} ticks`, accent:frame.armPosition>1400?"warn":"" }
  : frame.intake !== "off"
  ? { label:"Intake", value:frame.intake === "in" ? "Collecting" : "Reversed", detail:"Roller direction", accent:frame.intake==="out"?"warn":"" }
  : { label:"Run progress", value:`${Math.round(progress)}%`, detail:"Routine completion", accent:"" };

 return <section className="telemetry panel clean-telemetry">
  <div className="tool-panel-head"><div><h2>Telemetry</h2><p>Live robot data</p></div><span className="timecode">{frame.time.toFixed(2)} s</span></div>
  <div className="timeline"><span style={{width:`${progress}%`}}/><i style={{left:`${progress}%`}}/></div>
  <div className="metric-grid clean-metrics">
   <Metric label="Position" value={`${frame.x.toFixed(1)}, ${frame.y.toFixed(1)}`} detail="X / Y inches"/>
   <Metric label="Heading" value={`${frame.heading.toFixed(1)}°`} detail="Field relative" accent={Math.abs(frame.heading)>8?"warn":""}/>
   <Metric label="Drive power" value={`${frame.leftPower.toFixed(2)} / ${frame.rightPower.toFixed(2)}`} detail="Left / right"/>
   <Metric label="Encoders" value={`${Math.round(frame.leftEncoder)} / ${Math.round(frame.rightEncoder)}`} detail="Left / right ticks"/>
   <Metric {...subsystem}/>
  </div>
  <div className="event-section"><div className="event-title"><span>Events</span><b>{events.length}</b></div><div className="event-log">{events.length?events.slice(-4).reverse().map((e,i)=><div key={`${e.time}-${i}`} className={e.warning?"warning-event":"normal-event"}><time>{e.time.toFixed(2)}s</time><i>{e.warning?"!":"✓"}</i><span>{e.warning||e.event}</span></div>):<div className="empty-event">Events will appear during the simulation.</div>}</div></div>
 </section>
}

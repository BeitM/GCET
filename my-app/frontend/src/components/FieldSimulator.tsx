import { fieldSeasons } from "@/lib/seasons";
import { TelemetryFrame } from "@/lib/types";

const artifactClusters = [
  { left: 42, top: 13, colors: ["green", "purple", "purple"] },
  { left: 59, top: 13, colors: ["purple", "green", "purple"] },
  { left: 75, top: 13, colors: ["purple", "purple", "green"] },
  { left: 42, top: 83, colors: ["purple", "purple", "green"] },
  { left: 59, top: 83, colors: ["purple", "green", "purple"] },
  { left: 75, top: 83, colors: ["green", "purple", "purple"] },
];

function Artifacts({ colors, vertical = false }: { colors: string[]; vertical?: boolean }) {
  return <div className={`artifact-set ${vertical ? "vertical" : ""}`}>{colors.map((color, index) => <i key={index} className={color}><span /></i>)}</div>;
}

type FieldSimulatorProps = {
 frame:TelemetryFrame; trail:TelemetryFrame[]; running:boolean; robotWidth:number; robotLength:number;
 showPlayback:boolean; frameIndex:number; totalFrames:number; duration:number;
 onSeek:(index:number)=>void; onTogglePlayback:()=>void;
};

export function FieldSimulator({frame,trail,running,robotWidth,robotLength,showPlayback,frameIndex,totalFrames,duration,onSeek,onTogglePlayback}:FieldSimulatorProps){
  const x=frame.x/144*100,y=frame.y/144*100;
  return <section className="field-card panel clean-field-card">
    <div className="tool-panel-head">
      <div><h2>DECODE field</h2><p>2025–2026 season · Top-down view</p></div>
      <div className="field-head-actions">
        <div className="compact-seasons">{fieldSeasons.map(season=><span key={season.id} className={season.status}>{season.name}{season.status==="coming-soon"&&<small>Coming soon</small>}</span>)}</div>
        <div className={`run-state ${running?"active":""}`}><i />{running?"Running":"Ready"}</div>
      </div>
    </div>

    <div className="field-wrap decode-field-wrap">
      <div className="full-field reference-field">
        <svg className="reference-layout" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <rect width="100" height="100" fill="#292a2c" />
          {[16.667,33.333,50,66.667,83.333].map(n=><g key={n}><line x1={n} y1="0" x2={n} y2="100"/><line x1="0" y1={n} x2="100" y2={n}/></g>)}
          <rect className="perimeter" x=".3" y=".3" width="99.4" height="99.4" />

          <polygon className="depot red-depot" points="0,4 15,4 0,17" />
          <polygon className="depot blue-depot" points="0,83 15,96 0,96" />

          <path className="rail" d="M0 1.7 H51 V4 H20 V2.8 H0 M0 98.3 H51 V96 H20 V97.2 H0" />
          <path className="blue-tape" d="M51 3.7 H83 M49.5 84 V91" />
          <path className="red-tape" d="M51 96.3 H83 M49.5 9 V16" />

          <path className="field-marking" d="M0 17 L17 4 M10 10 L50 50 M100 33 L84 50 L100 67 M50 50 L10 90 M0 83 L17 96" />
          <path className="loading-border" d="M84 0 V16 H100 M84 100 V84 H100" />
          <rect className="base blue-base-shape" x="70.5" y="20.5" width="13" height="13" />
          <rect className="base red-base-shape" x="70.5" y="66.5" width="13" height="13" />
          <rect className="gate-shape red-gate-shape" x="48.5" y="9" width=".9" height="7" />
          <rect className="gate-shape red-gate-shape" x="50.4" y="9" width=".9" height="7" />
          <rect className="gate-shape blue-gate-shape" x="48.5" y="84" width=".9" height="7" />
          <rect className="gate-shape blue-gate-shape" x="50.4" y="84" width=".9" height="7" />
        </svg>

        {artifactClusters.map((cluster,index)=><div key={index} className="reference-artifacts" style={{left:`${cluster.left}%`,top:`${cluster.top}%`}}><Artifacts vertical colors={cluster.colors}/></div>)}
        <div className="loading-cluster top-loading"><Artifacts colors={["purple","green","purple"]}/></div>
        <div className="loading-cluster bottom-loading"><Artifacts colors={["purple","green","purple"]}/></div>

        <svg className="robot-trail" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={trail.map(f=>`${f.x/1.44},${f.y/1.44}`).join(" ")}/></svg>
        <div className="robot-sprite" style={{left:`${x}%`,top:`${y}%`,width:`${robotWidth/1.44}%`,height:`${robotLength/1.44}%`,transform:`translate(-50%,-50%) rotate(${frame.heading}deg)`}}>
          <div className="robot-front">▲</div><div className="wheel wl"/><div className="wheel wr"/><div className="wheel bl"/><div className="wheel br"/><div className="robot-core" />
        </div>
      </div>
      {showPlayback&&<div className="simulation-playback">
       <button type="button" className={running?"is-playing":""} onClick={onTogglePlayback} aria-label={running?"Pause simulation":"Play simulation"}>{running?"Ⅱ":"▶"}<span>{running?"Pause":"Play"}</span></button>
       <input aria-label="Simulation timeline" type="range" min="0" max={totalFrames-1} value={frameIndex} onChange={event=>onSeek(Number(event.target.value))}/>
       <time>{frame.time.toFixed(1)} / {duration.toFixed(1)} s</time>
      </div>}
    </div>
  </section>
}

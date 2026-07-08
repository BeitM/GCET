import { RobotState, ScenarioId, TelemetryFrame } from "./types";

const base:RobotState={x:20,y:122,heading:0,leftPower:0,rightPower:0,leftEncoder:0,rightEncoder:0,shooterTarget:0,shooterRpm:0,feeder:false,armTarget:0,armPosition:0,intake:"off",claw:"closed"};
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;

export function generateFrames(id:ScenarioId):TelemetryFrame[]{
  const frames:TelemetryFrame[]=[];
  for(let i=0;i<=60;i++){
    const p=i/60,time=p*(id==="inefficient"?12:id==="drift"?10:id==="shooter"||id==="arm"?8:7); let s={...base}; let event=""; let warning="";
    if(id==="drift") { s.x=lerp(20,83,p);s.y=122-19*p*p;s.heading=13.8*p*p;s.leftPower=p<.94?.7:0;s.rightPower=p<.94?.7:0;s.leftEncoder=2760*p;s.rightEncoder=2500*p;if(i===48)warning="Heading error > 8°"; }
    if(id==="shooter") { s.x=lerp(20,72,Math.min(1,p*2));s.y=lerp(122,86,Math.min(1,p*2));s.leftPower=p<.5?.45:0;s.rightPower=p<.5?.45:0;s.shooterTarget=3600;s.shooterRpm=Math.min(3600,3900*(1-Math.exp(-3.2*p)));s.feeder=p>.35&&p<.43;if(i===21){event="Feeder activated";warning="Shooter below target"} }
    if(id==="arm") { s.armTarget=1250;s.armPosition=p<.58?lerp(0,1486,p/.58):lerp(1486,1285,(p-.58)/.42);if(s.armPosition>1400)warning="Arm above safe range";if(i===35)event="Peak arm position"; }
    if(id==="intake") { s.x=lerp(20,56,Math.min(1,p*1.5));s.y=lerp(122,92,Math.min(1,p*1.5));s.leftPower=p<.68?.35:0;s.rightPower=p<.68?.35:0;s.intake=p<.78?"out":"off";if(i===18)warning="Element moving away"; }
    if(id==="inefficient") { const q=p*4;if(q<1){s.x=lerp(20,38,q);s.y=lerp(122,40,q);s.heading=0}else if(q<2){s.x=lerp(38,82,q-1);s.y=lerp(40,70,q-1);s.heading=lerp(0,90,q-1)}else if(q<3){s.x=lerp(82,73,q-2);s.y=lerp(70,102,q-2);s.heading=lerp(90,24,q-2)}else{s.x=lerp(73,122,q-3);s.y=lerp(102,25,q-3);s.heading=24}s.leftPower=p<.96?.62:0;s.rightPower=p<.96?.58:0;s.leftEncoder=4100*p;s.rightEncoder=3980*p;s.shooterTarget=3600;s.shooterRpm=Math.min(3600,Math.max(0,(p-.45)*7000));if(i===58)event="Score completed"; }
    frames.push({...s,time,event,warning});
  }
  return frames;
}

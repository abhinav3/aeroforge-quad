'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Scenario = 'Hover' | 'Cruise' | 'Gust';
type View = 'Flowfield' | 'Performance' | 'Dynamics';

const presets: Record<Scenario, { airspeed:number; pitch:number; rpm:number; heading:number }> = {
  Hover: { airspeed:0, pitch:0, rpm:5600, heading:0 },
  Cruise: { airspeed:12, pitch:8, rpm:6400, heading:0 },
  Gust: { airspeed:22, pitch:14, rpm:7200, heading:28 },
};

function Range({ label, value, min, max, step=1, unit, onChange }:{ label:string; value:number; min:number; max:number; step?:number; unit:string; onChange:(v:number)=>void }) {
  const fill = ((value-min)/(max-min))*100;
  return <div className="range-block">
    <label><span>{label}</span><output>{value.toFixed(step < 1 ? 1 : 0)} {unit}</output></label>
    <input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)} style={{'--fill':`${fill}%`} as React.CSSProperties}/>
    <div className="range-scale"><span>{min}</span><span>{max}</span></div>
  </div>;
}

function FlowFieldScene({airspeed,pitch,heading,rpm,drag,thrust,running}:{airspeed:number;pitch:number;heading:number;rpm:number;drag:number;thrust:number;running:boolean}) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;let frame=0;
    const draw=(now:number)=>{
      const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));
      const ctx=canvas.getContext('2d');if(!ctx)return;ctx.scale(dpr,dpr);const w=rect.width,h=rect.height,cx=w*.53,cy=h*.43;
      const styles=getComputedStyle(document.documentElement),ink=styles.getPropertyValue('--ink').trim(),orange=styles.getPropertyValue('--orange').trim();
      const sky=ctx.createLinearGradient(0,0,0,h*.7);sky.addColorStop(0,'#789eae');sky.addColorStop(.58,'#c4d4d1');sky.addColorStop(1,'#e8e2d2');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
      const sun=ctx.createRadialGradient(w*.79,h*.13,1,w*.79,h*.13,60);sun.addColorStop(0,'#fff3cddd');sun.addColorStop(1,'#fff3cd00');ctx.fillStyle=sun;ctx.beginPath();ctx.arc(w*.79,h*.13,60,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.moveTo(0,h*.39);[[.08,.28],[.18,.37],[.3,.23],[.41,.38],[.56,.29],[.66,.39],[.78,.25],[.9,.36],[1,.3]].forEach(p=>ctx.lineTo(w*p[0],h*p[1]));ctx.lineTo(w,h*.58);ctx.lineTo(0,h*.58);ctx.closePath();ctx.fillStyle='#607b76';ctx.globalAlpha=.5;ctx.fill();ctx.globalAlpha=1;
      const ground=ctx.createLinearGradient(0,h*.45,0,h);ground.addColorStop(0,'#99a695');ground.addColorStop(1,'#566f60');ctx.fillStyle=ground;ctx.fillRect(0,h*.45,w,h*.55);
      ctx.fillStyle='#58615f';ctx.beginPath();ctx.moveTo(w*.18,h);ctx.lineTo(w*.39,h*.47);ctx.lineTo(w*.71,h*.47);ctx.lineTo(w*.92,h);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#d7dacb88';ctx.lineWidth=1;for(let i=0;i<11;i++){const y=h*.49+i*i*h*.0042;ctx.beginPath();ctx.moveTo(w*(.39-i*.018),y);ctx.lineTo(w*(.71+i*.018),y);ctx.stroke()}for(let i=-5;i<=5;i++){ctx.beginPath();ctx.moveTo(cx+i*42,h);ctx.lineTo(cx+i*5,h*.47);ctx.stroke()}
      [[.1,.67],[.16,.73],[.87,.67],[.92,.75]].forEach(([x,y])=>{ctx.strokeStyle='#3b4b3d';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(w*x,h*y);ctx.lineTo(w*x,h*(y-.1));ctx.stroke();ctx.fillStyle='#365b47';ctx.beginPath();ctx.arc(w*x,h*(y-.12),16,0,Math.PI*2);ctx.fill()});
      const pressure=Math.min(1,airspeed/25);const hot=ctx.createRadialGradient(cx-64,cy,3,cx-64,cy,105);hot.addColorStop(0,`rgba(255,91,52,${.52*pressure})`);hot.addColorStop(1,'rgba(255,91,52,0)');ctx.fillStyle=hot;ctx.fillRect(cx-180,cy-115,230,230);const low=ctx.createRadialGradient(cx+38,cy-28,2,cx+38,cy-28,120);low.addColorStop(0,`rgba(39,208,202,${.28*pressure})`);low.addColorStop(1,'rgba(39,208,202,0)');ctx.fillStyle=low;ctx.fillRect(cx-80,cy-150,250,250);
      const flowAngle=heading*Math.PI/180*.35;ctx.save();ctx.translate(cx,cy);ctx.rotate(flowAngle);ctx.translate(-cx,-cy);ctx.lineCap='round';const phase=running?now*airspeed*.004:0;
      for(let i=0;i<17;i++){const base=h*.15+i*h*.043;ctx.beginPath();for(let x=-70;x<w+80;x+=12){const dx=x-cx,offset=base-cy;const bend=Math.sign(offset||1)*54*Math.exp(-(dx*dx)/18000)*Math.exp(-Math.abs(offset)/135);const wake=dx>75?Math.sin(dx*.055+i*.83+phase*.02)*13*Math.exp(-(dx-75)/360)*Math.exp(-Math.abs(offset)/170):0;const y=base+bend+wake;x===-70?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.strokeStyle=i%3===0?'rgba(139,244,235,.7)':'rgba(39,208,202,.42)';ctx.lineWidth=i%3===0?1.6:1;ctx.setLineDash([24,18]);ctx.lineDashOffset=-phase-i*7;ctx.stroke()}
      ctx.setLineDash([]);ctx.restore();
      const rotorPts=[[cx-112,cy-58],[cx+112,cy+58],[cx-112,cy+58],[cx+112,cy-58]];rotorPts.forEach(([x,y])=>{const wash=ctx.createLinearGradient(x,y,x,y+155);wash.addColorStop(0,'rgba(39,208,202,.25)');wash.addColorStop(1,'rgba(39,208,202,0)');ctx.fillStyle=wash;ctx.beginPath();ctx.moveTo(x-27,y+5);ctx.bezierCurveTo(x-38,y+70,x-54,y+115,x-70,y+160);ctx.lineTo(x+70,y+160);ctx.bezierCurveTo(x+54,y+115,x+38,y+70,x+27,y+5);ctx.closePath();ctx.fill();for(let k=0;k<3;k++){ctx.strokeStyle=`rgba(39,208,202,${.24-k*.055})`;ctx.beginPath();ctx.ellipse(x,y+35+k*38,30+k*13,8+k*4,0,0,Math.PI*2);ctx.stroke()}});
      ctx.save();ctx.translate(cx,cy);ctx.rotate(-pitch*Math.PI/180*.28);ctx.shadowColor='rgba(17,43,42,.38)';ctx.shadowBlur=18;ctx.shadowOffsetY=18;
      const arms=[[-112,-58],[112,58],[-112,58],[112,-58]];ctx.strokeStyle=ink;ctx.lineWidth=16;ctx.lineCap='round';for(let i=0;i<4;i+=2){ctx.beginPath();ctx.moveTo(arms[i][0],arms[i][1]);ctx.lineTo(arms[i+1][0],arms[i+1][1]);ctx.stroke()}ctx.strokeStyle='#63817f';ctx.lineWidth=3;for(let i=0;i<4;i+=2){ctx.beginPath();ctx.moveTo(arms[i][0],arms[i][1]-2);ctx.lineTo(arms[i+1][0],arms[i+1][1]-2);ctx.stroke()}ctx.shadowColor='transparent';
      arms.forEach(([x,y],i)=>{ctx.fillStyle='rgba(39,208,202,.14)';ctx.strokeStyle='#254c4d';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,62,20,-.08,0,Math.PI*2);ctx.fill();ctx.stroke();const a=now*.025*(rpm/6400)*(i%2?-1:1)*(running?1:0);ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.strokeStyle='#172f31';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-54,0);ctx.lineTo(54,0);ctx.stroke();ctx.rotate(Math.PI/2);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-40,0);ctx.lineTo(40,0);ctx.stroke();ctx.restore();ctx.fillStyle='#213b3d';ctx.beginPath();ctx.ellipse(x,y,12,10,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=orange;ctx.lineWidth=2;ctx.stroke()});
      ctx.fillStyle='#173f41';ctx.strokeStyle='#87a9a4';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(58,0);ctx.lineTo(34,-30);ctx.lineTo(-35,-31);ctx.lineTo(-60,-10);ctx.lineTo(-55,19);ctx.lineTo(-26,31);ctx.lineTo(37,25);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#315f60';ctx.beginPath();ctx.moveTo(42,-5);ctx.lineTo(22,-22);ctx.lineTo(-29,-20);ctx.lineTo(-43,-6);ctx.lineTo(-22,7);ctx.lineTo(25,8);ctx.closePath();ctx.fill();ctx.fillStyle=orange;ctx.fillRect(18,-22,18,5);
      ctx.strokeStyle='#183235';ctx.lineWidth=4;[[-28,-18],[-28,18],[27,-18],[27,18]].forEach(([x,y])=>{ctx.beginPath();ctx.moveTo(x,y+14);ctx.lineTo(x,y+42);ctx.stroke()});ctx.strokeStyle='#203d3f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-40,42);ctx.lineTo(40,42);ctx.stroke();
      ctx.fillStyle='#0d2022';ctx.beginPath();ctx.arc(57,4,9,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#77d5d0';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#ef4f4f';ctx.beginPath();ctx.arc(-7,-33,3.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#54d78b';ctx.beginPath();ctx.arc(-7,33,3.5,0,Math.PI*2);ctx.fill();ctx.restore();
      const arrow=(x1:number,y1:number,x2:number,y2:number,color:string,label:string)=>{const a=Math.atan2(y2-y1,x2-x1);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-Math.cos(a-.55)*10,y2-Math.sin(a-.55)*10);ctx.lineTo(x2-Math.cos(a+.55)*10,y2-Math.sin(a+.55)*10);ctx.closePath();ctx.fill();ctx.font='700 9px monospace';ctx.fillText(label,x2+8,y2-5)};arrow(cx,cy-20,cx,cy-Math.min(135,58+thrust*2),orange,`T ${thrust.toFixed(1)} N`);arrow(cx-25,cy+18,cx-Math.min(145,65+drag*12),cy+18,orange,`D ${drag.toFixed(2)} N`);
      ctx.fillStyle='rgba(16,44,47,.8)';ctx.font='700 9px monospace';ctx.fillText(`V∞ ${airspeed.toFixed(1)} m/s`,24,h-28);ctx.fillText(`RPM ${rpm.toFixed(0)}`,24,h-14);const vignette=ctx.createRadialGradient(cx,cy,100,cx,cy,Math.max(w,h)*.7);vignette.addColorStop(.6,'#00000000');vignette.addColorStop(1,'#0c25262f');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
      if(running)frame=requestAnimationFrame(draw);
    };
    draw(performance.now());const observer=new ResizeObserver(()=>{if(!running)draw(performance.now())});observer.observe(canvas);return()=>{cancelAnimationFrame(frame);observer.disconnect()};
  },[airspeed,pitch,heading,rpm,drag,thrust,running]);
  return <canvas ref={canvasRef} className="flow-canvas" aria-label="Three-dimensional aerodynamic flow field around a quadcopter in an outdoor test environment"/>;
}

function SweepChart({ rho, cd, area, current }:{rho:number; cd:number; area:number; current:number}) {
  const pts = Array.from({length:31},(_,v)=>({v,d:.5*rho*v*v*cd*area}));
  const maxD = Math.max(...pts.map(p=>p.d),1);
  const path = pts.map(p=>`${28+p.v/30*444},${145-p.d/maxD*116}`).join(' ');
  const x = 28+current/30*444;
  const d = .5*rho*current*current*cd*area;
  const y = 145-d/maxD*116;
  return <div className="chart-wrap">
    <div className="chart-head"><span>DRAG SWEEP</span><small>0–30 m/s</small></div>
    <svg viewBox="0 0 500 174" role="img" aria-label="Drag force across airspeed sweep">
      <g className="chart-grid"><line x1="28" y1="29" x2="472" y2="29"/><line x1="28" y1="87" x2="472" y2="87"/><line x1="28" y1="145" x2="472" y2="145"/></g>
      <polyline className="chart-area" points={`28,145 ${path} 472,145`}/><polyline className="chart-line" points={path}/>
      <line className="chart-cursor" x1={x} x2={x} y1="25" y2="146"/><circle className="chart-dot" cx={x} cy={y} r="5"/>
      <text x="28" y="164">0</text><text x="250" y="164" textAnchor="middle">15</text><text x="472" y="164" textAnchor="end">30 m/s</text>
      <text className="chart-value" x={Math.min(x+8,420)} y={Math.max(y-10,18)}>{d.toFixed(2)} N</text>
    </svg>
  </div>;
}

type FlightState = { x:number;y:number;z:number;u:number;v:number;w:number;phi:number;theta:number;psi:number;p:number;q:number;r:number;t:number };
type Waypoint = [number,number,number];
const initialFlight: FlightState = {x:0,y:0,z:0,u:0,v:0,w:0,phi:0,theta:0,psi:0,p:0,q:0,r:0,t:0};
const defaultWaypoints:Waypoint[]=[[0,0,2],[3,0,3],[3,3,3],[0,0,1.5]];

function FlightScene({history,flight,currentWp,waypoints}:{history:FlightState[];flight:FlightState;currentWp:number;waypoints:Waypoint[]}) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const dragRef=useRef<{x:number;y:number}|null>(null);
  const [camera,setCamera]=useState({yaw:-.72,elev:.48,zoom:1});

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const draw=()=>{
      const rect=canvas.getBoundingClientRect(), dpr=Math.min(window.devicePixelRatio||1,2);
      canvas.width=Math.max(1,Math.round(rect.width*dpr)); canvas.height=Math.max(1,Math.round(rect.height*dpr));
      const ctx=canvas.getContext('2d'); if(!ctx) return; ctx.scale(dpr,dpr);
      const w=rect.width,h=rect.height,cx=w*.5,cy=h*.57;
      const extent=Math.max(4,...history.flatMap(s=>[Math.abs(s.x),Math.abs(s.y),Math.abs(s.z)]),...waypoints.flatMap(p=>p.map(Math.abs)));
      const range=Math.min(14,Math.ceil(extent+1)), scale=Math.min(w,h)/(range*2.05), camDist=range*2.8;
      const project=(p:[number,number,number])=>{const [x,y,z]=p;const hx=Math.cos(camera.yaw)*x-Math.sin(camera.yaw)*y;const depth=Math.sin(camera.yaw)*x+Math.cos(camera.yaw)*y;const vy=Math.cos(camera.elev)*z-Math.sin(camera.elev)*depth;const vd=Math.sin(camera.elev)*z+Math.cos(camera.elev)*depth;const perspective=Math.max(.48,Math.min(1.8,camDist/(camDist-vd*.62)));return [cx+hx*scale*perspective*camera.zoom,cy-vy*scale*perspective*camera.zoom,perspective] as const};
      const line=(a:[number,number,number],b:[number,number,number],color:string,width=1,dash:number[]=[] )=>{const pa=project(a),pb=project(b);ctx.beginPath();ctx.moveTo(pa[0],pa[1]);ctx.lineTo(pb[0],pb[1]);ctx.strokeStyle=color;ctx.lineWidth=width*(pa[2]+pb[2])*.5;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([])};
      const polygon=(pts:[number,number,number][],fill:string,stroke?:string)=>{const ps=pts.map(project);ctx.beginPath();ps.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}};
      ctx.clearRect(0,0,w,h);
      const styles=getComputedStyle(document.documentElement), grid=styles.getPropertyValue('--line').trim(), ink=styles.getPropertyValue('--ink').trim(), cyan=styles.getPropertyValue('--cyan').trim(), orange=styles.getPropertyValue('--orange').trim(), green=styles.getPropertyValue('--green').trim();
      const sky=ctx.createLinearGradient(0,0,0,h*.58);sky.addColorStop(0,'#86a7b6');sky.addColorStop(.62,'#c8d5d0');sky.addColorStop(1,'#e9e5d8');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h*.6);
      const sun=ctx.createRadialGradient(w*.78,h*.14,2,w*.78,h*.14,45);sun.addColorStop(0,'#fff6cfdd');sun.addColorStop(1,'#fff6cf00');ctx.fillStyle=sun;ctx.beginPath();ctx.arc(w*.78,h*.14,45,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.moveTo(0,h*.39);[[.08,.28],[.17,.37],[.28,.24],[.38,.36],[.48,.3],[.59,.39],[.7,.25],[.82,.37],[.91,.3],[1,.39]].forEach(p=>ctx.lineTo(w*p[0],h*p[1]));ctx.lineTo(w,h*.61);ctx.lineTo(0,h*.61);ctx.closePath();ctx.fillStyle='#6f837c';ctx.globalAlpha=.42;ctx.fill();ctx.globalAlpha=1;
      const earth=ctx.createLinearGradient(0,h*.38,0,h);earth.addColorStop(0,'#b7b7a1');earth.addColorStop(1,'#718576');ctx.fillStyle=earth;ctx.fillRect(0,h*.39,w,h*.61);
      polygon([[-range,-range,0],[range,-range,0],[range,range,0],[-range,range,0]],'#7d917c88');
      polygon([[-range,-1.35,.01],[range,-1.35,.01],[range,1.35,.01],[-range,1.35,.01]],'#5e6765');
      for(let n=-range;n<=range;n++){ctx.globalAlpha=n%5===0?.42:.2;line([-range,n,0],[range,n,0],grid,n%5===0?1.15:.55);line([n,-range,0],[n,range,0],grid,n%5===0?1.15:.55)}ctx.globalAlpha=1;
      for(let n=-range;n<range;n+=2){line([n,-.04,.025],[n+1,-.04,.025],'#d8d7c7',1.4);line([n,.04,.025],[n+1,.04,.025],'#d8d7c7',1.4)}
      const pad:[number,number,number][]=Array.from({length:40},(_,i)=>[Math.cos(i/40*Math.PI*2)*.72,Math.sin(i/40*Math.PI*2)*.72,.035]);polygon(pad,'#263e3d',cyan);const padCenter=project([0,0,.04]);ctx.fillStyle='#d9e4dc';ctx.font=`700 ${Math.max(12,20*padCenter[2])}px Arial`;ctx.textAlign='center';ctx.fillText('H',padCenter[0],padCenter[1]+6);ctx.textAlign='start';
      const box=(x:number,y:number,z:number,bw:number,bd:number,bh:number)=>{const a:[number,number,number]=[x-bw/2,y-bd/2,z],b:[number,number,number]=[x+bw/2,y-bd/2,z],c:[number,number,number]=[x+bw/2,y+bd/2,z],d:[number,number,number]=[x-bw/2,y+bd/2,z],at:[number,number,number]=[a[0],a[1],z+bh],bt:[number,number,number]=[b[0],b[1],z+bh],ct:[number,number,number]=[c[0],c[1],z+bh],dt:[number,number,number]=[d[0],d[1],z+bh];polygon([a,b,bt,at],'#536564');polygon([b,c,ct,bt],'#3c5151');polygon([at,bt,ct,dt],'#82918a',ink)};
      box(-4.7,4.2,0,2.4,1.4,1.05);box(5.2,-4.5,0,1.8,1.4,.8);
      [[-5,-2],[-4,-3.5],[5,2.7],[6,4],[-6,4.5],[3.8,5.2]].forEach(([x,y])=>{line([x,y,0],[x,y,.75],'#4f5142',4);const p=project([x,y,.95]);ctx.beginPath();ctx.arc(p[0],p[1],Math.max(5,12*p[2]),0,Math.PI*2);ctx.fillStyle='#385d4b';ctx.fill();ctx.beginPath();ctx.arc(p[0]-4,p[1]+2,Math.max(3,8*p[2]),0,Math.PI*2);ctx.fillStyle='#557c61';ctx.fill()});
      line([0,0,0],[2,0,0],orange,2);line([0,0,0],[0,2,0],green,2);line([0,0,0],[0,0,2],'#377eaa',2);
      const label=(txt:string,p:[number,number,number],color:string)=>{const a=project(p);ctx.fillStyle=color;ctx.font='700 10px monospace';ctx.fillText(txt,a[0]+4,a[1]-4)};label('X',[2,0,0],orange);label('Y',[0,2,0],green);label('Z',[0,0,2],'#377eaa');
      ctx.beginPath();waypoints.forEach((p,i)=>{const m=project(p);i?ctx.lineTo(m[0],m[1]):ctx.moveTo(m[0],m[1])});ctx.strokeStyle='#8de0b1';ctx.globalAlpha=.75;ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
      waypoints.forEach((p,i)=>{const ground=project([p[0],p[1],0]),m=project(p);line([p[0],p[1],0],p,'#b8d7c5',.8,[3,4]);ctx.beginPath();ctx.arc(m[0],m[1],i===currentWp?8:5,0,Math.PI*2);ctx.fillStyle=i===currentWp?orange:green;ctx.fill();ctx.strokeStyle='#f5f2e9';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=ink;ctx.font='700 8px monospace';ctx.fillText(`WP${i+1}`,m[0]+9,m[1]-7);ctx.beginPath();ctx.ellipse(ground[0],ground[1],7*ground[2],3*ground[2],0,0,Math.PI*2);ctx.strokeStyle=green;ctx.stroke()});
      if(history.length>1){ctx.beginPath();history.forEach((s,i)=>{const p=project([s.x,s.y,s.z]);i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])});ctx.strokeStyle=cyan;ctx.shadowColor='#27d0ca';ctx.shadowBlur=5;ctx.lineWidth=2.5;ctx.stroke();ctx.shadowBlur=0}
      const shadow=project([flight.x,flight.y,0]),center=project([flight.x,flight.y,flight.z]);ctx.save();ctx.filter='blur(4px)';ctx.globalAlpha=Math.max(.12,.4-flight.z*.045);ctx.beginPath();ctx.ellipse(shadow[0],shadow[1],30*shadow[2],11*shadow[2],0,0,Math.PI*2);ctx.fillStyle='#18312c';ctx.fill();ctx.restore();line([flight.x,flight.y,0],[flight.x,flight.y,flight.z],orange,.8,[4,4]);
      const modelScale=1.55;const rotate=([x,y,z]:[number,number,number])=>{x*=modelScale;y*=modelScale;z*=modelScale;const cr=Math.cos(flight.phi),sr=Math.sin(flight.phi),cp=Math.cos(flight.theta),sp=Math.sin(flight.theta),cyw=Math.cos(flight.psi),syw=Math.sin(flight.psi);const x1=x,y1=cr*y-sr*z,z1=sr*y+cr*z;const x2=cp*x1+sp*z1,y2=y1,z2=-sp*x1+cp*z1;return [cyw*x2-syw*y2+flight.x,syw*x2+cyw*y2+flight.y,z2+flight.z] as [number,number,number]};
      const arm=.34,rotors:[number,number,number][]=[[-arm,-arm,.07],[arm,arm,.07],[-arm,arm,.07],[arm,-arm,.07]];
      rotors.forEach(p=>{line(rotate([0,0,0]),rotate(p),ink,9);line(rotate([0,0,.025]),rotate(p),'#567171',2)});
      [[-.19,-.15,-.02],[-.19,.15,-.02],[.19,-.15,-.02],[.19,.15,-.02]].forEach(p=>line(rotate(p as [number,number,number]),rotate([p[0],p[1],-.21]),'#263c3d',2));
      rotors.forEach((p,i)=>{const disk=Array.from({length:28},(_,n)=>rotate([p[0]+Math.cos(n/28*Math.PI*2)*.20,p[1]+Math.sin(n/28*Math.PI*2)*.20,p[2]]));ctx.globalAlpha=.16;polygon(disk,cyan,cyan);ctx.globalAlpha=1;const angle=flight.t*30*(i%2?-1:1);line(rotate([p[0]+Math.cos(angle)*.18,p[1]+Math.sin(angle)*.18,p[2]+.015]),rotate([p[0]-Math.cos(angle)*.18,p[1]-Math.sin(angle)*.18,p[2]+.015]),'#192f30',3);const hub=project(rotate(p));ctx.beginPath();ctx.arc(hub[0],hub[1],6*hub[2],0,Math.PI*2);ctx.fillStyle='#273d3f';ctx.fill();ctx.strokeStyle=orange;ctx.lineWidth=2;ctx.stroke();if(flight.z>.18){ctx.globalAlpha=.12;line(rotate([p[0],p[1],-.02]),[flight.x+(p[0]*modelScale),flight.y+(p[1]*modelScale),0],cyan,5);ctx.globalAlpha=1}});
      const body:[number,number,number][]=[[.29,0,.11],[.16,-.18,.11],[-.2,-.17,.11],[-.3,0,.11],[-.2,.17,.11],[.16,.18,.11]];polygon(body.map(rotate),'#153c3f','#88aaa4');const canopy:[[number,number,number],[number,number,number],[number,number,number],[number,number,number]]=[[.22,-.1,.13],[.08,-.13,.2],[-.14,-.1,.2],[-.2,0,.14]];polygon(canopy.map(rotate),'#315d5e','#7aa09b');
      const cameraPod=project(rotate([.31,0,.04]));ctx.beginPath();ctx.arc(cameraPod[0],cameraPod[1],5*cameraPod[2],0,Math.PI*2);ctx.fillStyle='#0d2022';ctx.fill();ctx.strokeStyle='#7fd6d1';ctx.lineWidth=1.5;ctx.stroke();
      const port=project(rotate([0,-.2,.1])),starboard=project(rotate([0,.2,.1]));ctx.fillStyle='#ef4949';ctx.beginPath();ctx.arc(port[0],port[1],3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#54d78b';ctx.beginPath();ctx.arc(starboard[0],starboard[1],3,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#153133';ctx.font='700 9px monospace';ctx.fillText(`ALT ${flight.z.toFixed(2)} m`,center[0]+15,center[1]-12);
      const vignette=ctx.createRadialGradient(cx,cy,Math.min(w,h)*.2,cx,cy,Math.max(w,h)*.7);vignette.addColorStop(.65,'#00000000');vignette.addColorStop(1,'#0c252635');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
    };
    draw(); const observer=new ResizeObserver(draw);observer.observe(canvas);return()=>observer.disconnect();
  },[history,flight,camera,currentWp,waypoints]);

  const move=(x:number,y:number)=>{const d=dragRef.current;if(!d)return;setCamera(c=>({...c,yaw:c.yaw+(x-d.x)*.008,elev:Math.max(.08,Math.min(1.25,c.elev+(y-d.y)*.006))}));dragRef.current={x,y}};
  return <div className="flight-canvas-wrap"><canvas ref={canvasRef} className="flight-canvas" aria-label="Perspective 3D quadcopter flying above an outdoor test field"
    onPointerDown={e=>{dragRef.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>move(e.clientX,e.clientY)} onPointerUp={()=>dragRef.current=null}
    onWheel={e=>{e.preventDefault();setCamera(c=>({...c,zoom:Math.max(.65,Math.min(1.8,c.zoom-e.deltaY*.001))}))}}/>
    <div className="camera-presets" aria-label="Camera views"><button onClick={()=>setCamera({yaw:-.72,elev:.48,zoom:1})}>ISO</button><button onClick={()=>setCamera({yaw:0,elev:1.18,zoom:.88})}>TOP</button><button onClick={()=>setCamera({yaw:-flight.psi-Math.PI/2,elev:.28,zoom:1.25})}>CHASE</button></div>
  </div>;
}

type ControllerSample={t:number;x:number;y:number;z:number;tx:number;ty:number;tz:number;error:number;p:number;i:number;d:number;gust:number;rpm:number;saturation:number;power:number};
type LabTab='Mission'|'Controller'|'Signals'|'Realism'|'Score'|'Learn';
type Gains={kp:number;ki:number;kd:number};

function SignalChart({samples,series}:{samples:ControllerSample[];series:{key:keyof ControllerSample;label:string;color:string}[]}){
  const w=440,h=126,pad=18,values=series.flatMap(s=>samples.map(row=>Number(row[s.key]))),min=Math.min(0,...values),max=Math.max(1,...values),span=max-min||1;
  const path=(key:keyof ControllerSample)=>samples.map((row,i)=>`${i?'L':'M'}${pad+i/Math.max(1,samples.length-1)*(w-pad*2)},${h-pad-(Number(row[key])-min)/span*(h-pad*2)}`).join(' ');
  return <svg className="signal-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={series.map(s=>s.label).join(' and ')}><line x1={pad} y1={h-pad} x2={w-pad} y2={h-pad}/><line x1={pad} y1={pad} x2={pad} y2={h-pad}/>{series.map(s=><path key={s.key} d={path(s.key)} style={{stroke:s.color}}/>)}<text x={pad} y="12">{max.toFixed(1)}</text><text x={pad} y={h-3}>{min.toFixed(1)}</text></svg>;
}

function FlightDynamics({baseRpm,mass,rho,diameter}:{baseRpm:number;mass:number;rho:number;diameter:number}) {
  const [flight,setFlight]=useState<FlightState>(initialFlight),[history,setHistory]=useState<FlightState[]>([initialFlight]);
  const [active,setActive]=useState(false),[mode,setMode]=useState<'Manual'|'PID'>('PID'),[tab,setTab]=useState<LabTab>('Mission');
  const [trim,setTrim]=useState([0,0,0,0]),[gust,setGust]=useState(0),[wpIndex,setWpIndex]=useState(0);
  const [waypoints,setWaypoints]=useState<Waypoint[]>(()=>defaultWaypoints.map(point=>[...point] as Waypoint));
  const [posGains,setPosGains]=useState<Gains>({kp:1.5,ki:.1,kd:1}),[altGains,setAltGains]=useState<Gains>({kp:5,ki:.8,kd:3});
  const [pidParts,setPidParts]=useState({p:true,i:true,d:true}),[architecture,setArchitecture]=useState<'Direct'|'Cascaded'>('Cascaded');
  const [limits,setLimits]=useState({radius:.45,velocity:3,tilt:18,rpm:10000,thrust:32});
  const [realism,setRealism]=useState({gpsNoise:.02,imuBias:0,motorLag:.08,batterySag:.08,turbulence:.4,payload:0,cgOffset:0,groundEffect:true});
  const [motorOutput,setMotorOutput]=useState([baseRpm,baseRpm,baseRpm,baseRpm]),[terms,setTerms]=useState({p:0,i:0,d:0,roll:0,pitch:0,collective:0});
  const [samples,setSamples]=useState<ControllerSample[]>([]),[missionComplete,setMissionComplete]=useState(false),[notice,setNotice]=useState('DEFAULT CONFIGURATION');
  const [replayIndex,setReplayIndex]=useState<number|null>(null),[savedGains,setSavedGains]=useState<{pos:Gains;alt:Gains}|null>(null);
  const pidRef=useRef({ix:0,iy:0,iz:0,ex:0,ey:0,ez:0}),motorRef=useRef([baseRpm,baseRpm,baseRpm,baseRpm]),sampleRef=useRef(0);
  const manualMotors=trim.map(v=>Math.max(0,baseRpm*(1+v/100))),target=waypoints[Math.min(wpIndex,waypoints.length-1)],effectiveMass=mass+realism.payload;

  useEffect(()=>{if(replayIndex===null)return;const timer=window.setInterval(()=>setReplayIndex(i=>i===null?null:i>=history.length-1?null:i+1),45);return()=>window.clearInterval(timer)},[replayIndex,history.length]);
  useEffect(()=>{
    if(!active)return;
    const timer=window.setInterval(()=>setFlight(s=>{
      const dt=.02,arm=.225,ix=.012+effectiveMass*.001,iy=ix,iz=.02+effectiveMass*.0015,pid=pidRef.current;
      let motors=manualMotors,error=[0,0,0],pTerm=0,iTerm=0,dTerm=0,desiredRoll=0,desiredPitch=0,collective=effectiveMass*9.80665;
      const sensorWave=Math.sin(s.t*7.7)*realism.gpsNoise,sensed={x:s.x+sensorWave,y:s.y-sensorWave*.7,z:s.z+Math.sin(s.t*9.1)*realism.gpsNoise+realism.imuBias};
      if(mode==='PID'){
        error=[target[0]-sensed.x,target[1]-sensed.y,target[2]-sensed.z];
        pid.ix=Math.max(-3,Math.min(3,pid.ix+error[0]*dt));pid.iy=Math.max(-3,Math.min(3,pid.iy+error[1]*dt));pid.iz=Math.max(-5,Math.min(5,pid.iz+error[2]*dt));
        const dex=(error[0]-pid.ex)/dt,dey=(error[1]-pid.ey)/dt,dez=(error[2]-pid.ez)/dt;pid.ex=error[0];pid.ey=error[1];pid.ez=error[2];
        pTerm=pidParts.p?posGains.kp*Math.hypot(error[0],error[1]):0;iTerm=pidParts.i?posGains.ki*Math.hypot(pid.ix,pid.iy):0;dTerm=pidParts.d?posGains.kd*Math.hypot(dex,dey):0;
        const rawX=(pidParts.p?posGains.kp*error[0]:0)+(pidParts.i?posGains.ki*pid.ix:0)+(pidParts.d?posGains.kd*dex:0),rawY=(pidParts.p?posGains.kp*error[1]:0)+(pidParts.i?posGains.ki*pid.iy:0)+(pidParts.d?posGains.kd*dey:0);
        const desiredU=Math.max(-limits.velocity,Math.min(limits.velocity,rawX)),desiredV=Math.max(-limits.velocity,Math.min(limits.velocity,rawY));
        const axCmd=architecture==='Cascaded'?1.35*(desiredU-s.u):rawX,ayCmd=architecture==='Cascaded'?1.35*(desiredV-s.v):rawY,maxTilt=limits.tilt*Math.PI/180;
        desiredPitch=Math.max(-maxTilt,Math.min(maxTilt,axCmd/9.80665));desiredRoll=Math.max(-maxTilt,Math.min(maxTilt,-ayCmd/9.80665));
        const zCmd=(pidParts.p?altGains.kp*error[2]:0)+(pidParts.i?altGains.ki*pid.iz:0)+(pidParts.d?altGains.kd*dez:0),tauX=Math.max(-.6,Math.min(.6,.2*(desiredRoll-s.phi)-.05*s.p)),tauY=Math.max(-.6,Math.min(.6,.2*(desiredPitch-s.theta)-.05*s.q));
        collective=Math.max(0,Math.min(limits.thrust,effectiveMass*9.80665+zCmd));const motorThrust=[collective/4-tauY/(2*arm),collective/4-tauX/(2*arm),collective/4+tauY/(2*arm),collective/4+tauX/(2*arm)];
        const maxRpm=limits.rpm*(1-realism.batterySag*.12),commanded=motorThrust.map(t=>Math.max(2500,Math.min(maxRpm,60*Math.sqrt(Math.max(.01,t)/(.102*rho*Math.pow(diameter,4))))));const alpha=Math.min(1,dt/(realism.motorLag+dt));motors=commanded.map((m,i)=>motorRef.current[i]+(m-motorRef.current[i])*alpha);
        if(Math.hypot(...error)<limits.radius){if(wpIndex<waypoints.length-1){setWpIndex(i=>i+1);pidRef.current={ix:0,iy:0,iz:0,ex:0,ey:0,ez:0}}else setMissionComplete(true)}
      }
      motorRef.current=motors;setMotorOutput(motors);setTerms({p:pTerm,i:iTerm,d:dTerm,roll:desiredRoll*180/Math.PI,pitch:desiredPitch*180/Math.PI,collective});
      const thrusts=motors.map(m=>.102*rho*Math.pow(m/60,2)*Math.pow(diameter,4)),groundMultiplier=realism.groundEffect&&s.z<1?1+(1-s.z)*.12:1,total=thrusts.reduce((a,b)=>a+b,0)*groundMultiplier;
      const tauX=arm*(thrusts[3]-thrusts[1]),tauY=arm*(thrusts[2]-thrusts[0])+collective*realism.cgOffset*.015,tauZ=7.5e-9*(motors[0]**2-motors[1]**2+motors[2]**2-motors[3]**2),turbulence=realism.turbulence*(Math.sin(s.t*2.7)+.45*Math.sin(s.t*7.3));
      const ax=total/effectiveMass*Math.sin(s.theta)-.1*s.u*Math.abs(s.u)/effectiveMass+(gust+turbulence)/effectiveMass,ay=-total/effectiveMass*Math.sin(s.phi)-.1*s.v*Math.abs(s.v)/effectiveMass,az=total/effectiveMass*Math.cos(s.phi)*Math.cos(s.theta)-9.80665-.2*s.w*Math.abs(s.w)/effectiveMass;
      const np=s.p+(tauX/ix-.45*s.p)*dt,nq=s.q+(tauY/iy-.45*s.q)*dt,nr=s.r+(tauZ/iz-.65*s.r)*dt,next={x:s.x+s.u*dt,y:s.y+s.v*dt,z:Math.max(0,s.z+s.w*dt),u:s.u+ax*dt,v:s.v+ay*dt,w:s.z<=0&&s.w<0?0:s.w+az*dt,phi:s.phi+np*dt,theta:s.theta+nq*dt,psi:s.psi+nr*dt,p:np,q:nq,r:nr,t:s.t+dt};
      setHistory(h=>[...h.slice(-599),next]);if(++sampleRef.current%5===0){const avg=motors.reduce((a,b)=>a+b,0)/4;setSamples(rows=>[...rows.slice(-239),{t:next.t,x:next.x,y:next.y,z:next.z,tx:target[0],ty:target[1],tz:target[2],error:Math.hypot(...error),p:pTerm,i:iTerm,d:dTerm,gust:gust+turbulence,rpm:avg,saturation:avg>limits.rpm*.97?1:0,power:4*1.1e-7*avg*avg}])}return next;
    }),20);return()=>window.clearInterval(timer);
  },[active,baseRpm,rho,diameter,gust,mode,wpIndex,target.join(','),waypoints.length,effectiveMass,posGains,altGains,pidParts,architecture,limits,realism,trim.join(',')]);

  const reset=()=>{setActive(false);setReplayIndex(null);setFlight(initialFlight);setHistory([initialFlight]);setSamples([]);setTrim([0,0,0,0]);setGust(0);setWpIndex(0);setMissionComplete(false);setMotorOutput([baseRpm,baseRpm,baseRpm,baseRpm]);motorRef.current=[baseRpm,baseRpm,baseRpm,baseRpm];pidRef.current={ix:0,iy:0,iz:0,ex:0,ey:0,ez:0}};
  const setWaypointValue=(index:number,axis:number,value:number)=>{if(!Number.isFinite(value))return;setWaypoints(points=>points.map((point,i)=>i===index?point.map((coordinate,a)=>a===axis?value:coordinate) as Waypoint:point))};
  const addWaypoint=()=>setWaypoints(points=>{const last=points.at(-1)??[0,0,2];return [...points,[last[0],last[1],Math.max(.2,last[2])] as Waypoint]});
  const removeWaypoint=(index:number)=>setWaypoints(points=>{if(points.length===1)return points;const next=points.filter((_,i)=>i!==index);setWpIndex(current=>Math.min(current,next.length-1));return next});
  const restoreWaypoints=()=>{setWaypoints(defaultWaypoints.map(point=>[...point] as Waypoint));setWpIndex(0);setNotice('DEFAULT MISSION RESTORED')};
  const applyPreset=(name:'Stable'|'Responsive'|'Oscillatory'|'Wind')=>{const presets={Stable:[{kp:1.2,ki:.08,kd:1.25},{kp:4.5,ki:.6,kd:3.4}],Responsive:[{kp:2.2,ki:.14,kd:.9},{kp:6.5,ki:1,kd:2.5}],Oscillatory:[{kp:4.2,ki:.5,kd:.05},{kp:9,ki:1.8,kd:.2}],Wind:[{kp:1.8,ki:.28,kd:1.4},{kp:5.5,ki:1.1,kd:3.6}]} as const;setPosGains(presets[name][0]);setAltGains(presets[name][1]);setNotice(`${name.toUpperCase()} PRESET`)};
  const saveConfig=()=>{const data={posGains,altGains,limits,realism,waypoints,architecture};localStorage.setItem('aeroforge-controller',JSON.stringify(data));setSavedGains({pos:{...posGains},alt:{...altGains}});setNotice('CONFIGURATION SAVED')};
  const loadConfig=()=>{const raw=localStorage.getItem('aeroforge-controller');if(!raw){setNotice('NO SAVED CONFIGURATION');return}const data=JSON.parse(raw);setPosGains(data.posGains);setAltGains(data.altGains);setLimits(data.limits);setRealism(data.realism);setWaypoints(data.waypoints);setArchitecture(data.architecture);setNotice('CONFIGURATION LOADED')};
  const exportController=()=>{const rows=['time,x,y,z,target_x,target_y,target_z,error,p_term,i_term,d_term,gust,rpm,power_w',...samples.map(s=>[s.t,s.x,s.y,s.z,s.tx,s.ty,s.tz,s.error,s.p,s.i,s.d,s.gust,s.rpm,s.power].join(','))];const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'}));a.download='aeroforge-flight-controller.csv';a.click();URL.revokeObjectURL(a.href)};
  const rms=Math.sqrt(samples.reduce((sum,s)=>sum+s.error*s.error,0)/Math.max(1,samples.length)),overshoot=Math.max(0,...samples.map(s=>s.z-Math.max(...waypoints.map(p=>p[2])))),sat=samples.reduce((sum,s)=>sum+s.saturation,0)/Math.max(1,samples.length),energy=samples.reduce((sum,s)=>sum+s.power*.1/3600,0),score=Math.max(0,Math.min(100,100-rms*12-overshoot*8-sat*35));
  const displayIndex=replayIndex===null?history.length-1:Math.min(replayIndex,history.length-1),displayFlight=replayIndex===null?flight:history[displayIndex],displayHistory=replayIndex===null?history:history.slice(0,displayIndex+1),deg=(v:number)=>v*180/Math.PI;
  const gainInput=(group:'pos'|'alt',key:keyof Gains,value:number)=><input aria-label={`${group} ${key}`} type="number" min="0" max="12" step="0.05" value={value} onChange={e=>(group==='pos'?setPosGains:setAltGains)(g=>({...g,[key]:+e.target.value}))}/>;

  return <div className="dynamics-view">
    <div className="performance-title"><div><span>INTERACTIVE FLIGHT-CONTROL LAB</span><h2>PID waypoint flight</h2></div><p>Follow the live control chain, tune the loops and add real-world effects while the 6-DOF vehicle flies.</p></div>
    <div className="dynamics-grid lab-grid">
      <div className="flight-arena"><div className="arena-head"><span>3D TRAJECTORY / WORLD FRAME</span><b>{missionComplete?'MISSION COMPLETE':`WP ${wpIndex+1} · ${Math.hypot(target[0]-flight.x,target[1]-flight.y,target[2]-flight.z).toFixed(2)} m`}</b></div><FlightScene history={displayHistory} flight={displayFlight} currentWp={wpIndex} waypoints={waypoints}/><div className="control-flow" aria-label="Live controller signal flow"><div><span>WAYPOINT</span><b>{target.map(v=>v.toFixed(1)).join(' / ')}</b></div><i>→</i><div><span>PID ERROR</span><b>{Math.hypot(target[0]-flight.x,target[1]-flight.y,target[2]-flight.z).toFixed(2)} m</b></div><i>→</i><div><span>ATTITUDE</span><b>{terms.roll.toFixed(1)}° / {terms.pitch.toFixed(1)}°</b></div><i>→</i><div><span>MOTOR MIX</span><b>{(motorOutput.reduce((a,b)=>a+b,0)/4).toFixed(0)} rpm</b></div></div><div className="arena-axis"><span>DRAG TO ORBIT · SCROLL TO ZOOM</span><span>{replayIndex===null?'LIVE PHYSICS':'FLIGHT REPLAY'}</span></div></div>
      <div className="motor-panel lab-panel">
        <div className="lab-tabs" role="tablist">{(['Mission','Controller','Signals','Realism','Score','Learn'] as LabTab[]).map(name=><button role="tab" aria-selected={tab===name} className={tab===name?'active':''} onClick={()=>setTab(name)} key={name}>{name}</button>)}</div>
        <div className="lab-tab-body" aria-live="polite">
          {tab==='Mission'&&<><div className="mode-switch"><button className={mode==='PID'?'active':''} onClick={()=>setMode('PID')}>PID WAYPOINT</button><button className={mode==='Manual'?'active':''} onClick={()=>setMode('Manual')}>MANUAL MIX</button></div><div className="waypoint-editor"><div className="waypoint-head"><span>MISSION WAYPOINTS</span><small>X / Y / Z · METRES</small></div>{waypoints.map((point,i)=><div className={`waypoint-row ${i===wpIndex?'active':''}`} key={i}><button className="waypoint-select" onClick={()=>setWpIndex(i)}>WP{i+1}</button>{point.map((value,axis)=><input key={axis} aria-label={`Waypoint ${i+1} ${['X','Y','Z'][axis]}`} type="number" min={axis===2?.2:-20} max="20" step="0.1" value={value} onChange={e=>setWaypointValue(i,axis,+e.target.value)}/>) }<button className="waypoint-remove" disabled={waypoints.length===1} onClick={()=>removeWaypoint(i)}>×</button></div>)}<div className="waypoint-actions"><button onClick={addWaypoint}>＋ ADD</button><button onClick={restoreWaypoints}>↺ DEFAULTS</button></div></div><div className="compact-grid"><label>Acceptance radius <b>{limits.radius.toFixed(2)} m</b><input type="range" min=".15" max="1.5" step=".05" value={limits.radius} onChange={e=>setLimits(v=>({...v,radius:+e.target.value}))}/></label><label>Max velocity <b>{limits.velocity.toFixed(1)} m/s</b><input type="range" min=".5" max="7" step=".1" value={limits.velocity} onChange={e=>setLimits(v=>({...v,velocity:+e.target.value}))}/></label><label>Max tilt <b>{limits.tilt}°</b><input type="range" min="5" max="40" value={limits.tilt} onChange={e=>setLimits(v=>({...v,tilt:+e.target.value}))}/></label><label>Max RPM <b>{limits.rpm}</b><input type="range" min="6000" max="12000" step="100" value={limits.rpm} onChange={e=>setLimits(v=>({...v,rpm:+e.target.value}))}/></label></div></>}
          {tab==='Controller'&&<><div className="controller-presets">{(['Stable','Responsive','Oscillatory','Wind'] as const).map(name=><button key={name} onClick={()=>applyPreset(name)}>{name}</button>)}</div><label className="select-row">Architecture<select value={architecture} onChange={e=>setArchitecture(e.target.value as 'Direct'|'Cascaded')}><option>Cascaded</option><option>Direct</option></select></label><div className="gain-table"><span>LOOP</span><b>Kₚ</b><b>Kᵢ</b><b>K<sub>d</sub></b><span>POSITION</span>{gainInput('pos','kp',posGains.kp)}{gainInput('pos','ki',posGains.ki)}{gainInput('pos','kd',posGains.kd)}<span>ALTITUDE</span>{gainInput('alt','kp',altGains.kp)}{gainInput('alt','ki',altGains.ki)}{gainInput('alt','kd',altGains.kd)}</div><div className="pid-switches">{(['p','i','d'] as const).map(key=><label key={key}><input type="checkbox" checked={pidParts[key]} onChange={e=>setPidParts(v=>({...v,[key]:e.target.checked}))}/>{key.toUpperCase()} TERM</label>)}</div><div className="term-bars">{(['p','i','d'] as const).map(key=><div key={key}><span>{key.toUpperCase()}</span><i style={{width:`${Math.min(100,terms[key]*10)}%`}}/><b>{terms[key].toFixed(2)}</b></div>)}</div><div className="motor-bank">{(mode==='Manual'?manualMotors:motorOutput).map((m,i)=><div className="motor-control" key={i}><label><span>M{i+1} <i>{i%2?'CCW':'CW'}</i></span><b>{m.toFixed(0)} rpm</b></label><input disabled={mode==='PID'} type="range" min="-12" max="12" step=".5" value={trim[i]} onChange={e=>setTrim(t=>t.map((v,n)=>n===i?+e.target.value:v))}/></div>)}</div></>}
          {tab==='Signals'&&<><div className="signal-legend"><span className="actual">ACTUAL</span><span className="target">TARGET</span><span className="error">ERROR</span></div><h3>Altitude tracking</h3><SignalChart samples={samples} series={[{key:'z',label:'Actual altitude',color:'var(--cyan)'},{key:'tz',label:'Target altitude',color:'var(--orange)'}]}/><h3>Position error / disturbance</h3><SignalChart samples={samples} series={[{key:'error',label:'Position error',color:'var(--orange)'},{key:'gust',label:'Wind disturbance',color:'var(--green)'}]}/><div className="signal-readouts"><span>TRUE Z <b>{flight.z.toFixed(3)} m</b></span><span>MEASURED Z <b>{(flight.z+Math.sin(flight.t*9.1)*realism.gpsNoise+realism.imuBias).toFixed(3)} m</b></span><span>UPDATE <b>50 Hz</b></span></div></>}
          {tab==='Realism'&&<><div className="compact-grid realism-grid"><label>GPS noise <b>±{realism.gpsNoise.toFixed(2)} m</b><input type="range" min="0" max=".5" step=".01" value={realism.gpsNoise} onChange={e=>setRealism(v=>({...v,gpsNoise:+e.target.value}))}/></label><label>IMU / altitude bias <b>{realism.imuBias.toFixed(2)} m</b><input type="range" min="-.3" max=".3" step=".01" value={realism.imuBias} onChange={e=>setRealism(v=>({...v,imuBias:+e.target.value}))}/></label><label>Motor response delay <b>{realism.motorLag.toFixed(2)} s</b><input type="range" min="0" max=".5" step=".01" value={realism.motorLag} onChange={e=>setRealism(v=>({...v,motorLag:+e.target.value}))}/></label><label>Battery sag <b>{(realism.batterySag*100).toFixed(0)}%</b><input type="range" min="0" max=".5" step=".01" value={realism.batterySag} onChange={e=>setRealism(v=>({...v,batterySag:+e.target.value}))}/></label><label>Turbulence <b>{realism.turbulence.toFixed(1)} N</b><input type="range" min="0" max="5" step=".1" value={realism.turbulence} onChange={e=>setRealism(v=>({...v,turbulence:+e.target.value}))}/></label><label>Payload <b>{realism.payload.toFixed(2)} kg</b><input type="range" min="0" max="2" step=".05" value={realism.payload} onChange={e=>setRealism(v=>({...v,payload:+e.target.value}))}/></label><label>CG offset <b>{realism.cgOffset.toFixed(2)} m</b><input type="range" min="-.2" max=".2" step=".01" value={realism.cgOffset} onChange={e=>setRealism(v=>({...v,cgOffset:+e.target.value}))}/></label><label>Lateral gust <b>{gust.toFixed(1)} N</b><input type="range" min="-6" max="6" step=".2" value={gust} onChange={e=>setGust(+e.target.value)}/></label></div><label className="check-row"><input type="checkbox" checked={realism.groundEffect} onChange={e=>setRealism(v=>({...v,groundEffect:e.target.checked}))}/>GROUND EFFECT MODEL</label><div className="sensor-stack"><div><span>GPS</span><b>{realism.gpsNoise?'NOISY':'IDEAL'}</b></div><div><span>IMU / BARO</span><b>{realism.imuBias?'BIASED':'CALIBRATED'}</b></div><div><span>BATTERY</span><b>{(100-realism.batterySag*100).toFixed(0)}%</b></div><div><span>ACTUATORS</span><b>{realism.motorLag?'DYNAMIC':'INSTANT'}</b></div></div></>}
          {tab==='Score'&&<><div className="score-hero"><strong>{score.toFixed(0)}</strong><span>STABILITY SCORE / 100</span></div><div className="score-grid"><div><span>RMS TRACKING ERROR</span><b>{rms.toFixed(2)} m</b></div><div><span>ALTITUDE OVERSHOOT</span><b>{overshoot.toFixed(2)} m</b></div><div><span>MOTOR SATURATION</span><b>{(sat*100).toFixed(1)}%</b></div><div><span>ENERGY ESTIMATE</span><b>{energy.toFixed(3)} Wh</b></div><div><span>MISSION TIME</span><b>{flight.t.toFixed(1)} s</b></div><div><span>WAYPOINTS</span><b>{wpIndex+1} / {waypoints.length}</b></div></div><div className="score-actions"><button onClick={exportController}>EXPORT CSV</button><button onClick={saveConfig}>SAVE CONFIG</button><button onClick={loadConfig}>LOAD CONFIG</button><button disabled={history.length<3} onClick={()=>{setActive(false);setReplayIndex(0)}}>REPLAY FLIGHT</button></div>{savedGains&&<div className="gain-compare"><span>SAVED ↔ CURRENT</span><b>POS Kₚ {savedGains.pos.kp.toFixed(2)} → {posGains.kp.toFixed(2)}</b><b>ALT Kₚ {savedGains.alt.kp.toFixed(2)} → {altGains.kp.toFixed(2)}</b></div>}</>}
          {tab==='Learn'&&<><div className="lesson"><b>P — REACTION</b><p>Pushes toward the waypoint in proportion to current error. Too much causes overshoot.</p><button onClick={()=>{setPidParts({p:true,i:false,d:false});setNotice('P-ONLY EXPERIMENT')}}>TRY P ONLY</button></div><div className="lesson"><b>I — MEMORY</b><p>Accumulates persistent error to reject bias, payload and steady wind. Excess creates windup.</p><button onClick={()=>{setPidParts({p:true,i:true,d:false});setNotice('PI EXPERIMENT')}}>TRY PI</button></div><div className="lesson"><b>D — DAMPING</b><p>Responds to how quickly error changes, reducing oscillation but amplifying sensor noise.</p><button onClick={()=>{setPidParts({p:true,i:true,d:true});applyPreset('Stable')}}>RESTORE PID</button></div><div className="lesson"><b>AUTO-TUNE START</b><p>Loads conservative gains scaled for this analytical vehicle model.</p><button onClick={()=>{setPosGains({kp:1.2+effectiveMass*.2,ki:.08,kd:1.15});setAltGains({kp:4+effectiveMass,ki:.65,kd:3.2});setNotice('MODEL-BASED AUTO-TUNE')}}>AUTO-TUNE</button></div><div className="failure-demos"><button onClick={()=>applyPreset('Oscillatory')}>DEMO: LOW DAMPING</button><button onClick={()=>{applyPreset('Wind');setGust(5)}}>DEMO: WIND RECOVERY</button><button onClick={()=>{setLimits(v=>({...v,thrust:effectiveMass*8}));setNotice('INSUFFICIENT THRUST')}}>DEMO: THRUST LIMIT</button></div></>}
        </div>
        <div className="lab-notice">{notice}</div><div className="dynamics-actions"><button onClick={()=>{setReplayIndex(null);setActive(!active)}}>{active?'Ⅱ PAUSE':'▶ RUN'}</button><button onClick={reset}>↺ RESET FLIGHT</button></div>
      </div>
    </div>
    <div className="state-strip"><div><span>POSITION x / y / z</span><b>{flight.x.toFixed(2)} / {flight.y.toFixed(2)} / {flight.z.toFixed(2)} m</b></div><div><span>VELOCITY u / v / w</span><b>{flight.u.toFixed(2)} / {flight.v.toFixed(2)} / {flight.w.toFixed(2)} m/s</b></div><div><span>ATTITUDE ϕ / θ / ψ</span><b>{deg(flight.phi).toFixed(1)} / {deg(flight.theta).toFixed(1)} / {deg(flight.psi).toFixed(1)}°</b></div><div><span>RATES p / q / r</span><b>{deg(flight.p).toFixed(1)} / {deg(flight.q).toFixed(1)} / {deg(flight.r).toFixed(1)} °/s</b></div></div>
  </div>;
}

export default function Home() {
  const [scenario,setScenario] = useState<Scenario>('Cruise');
  const [view,setView] = useState<View>('Flowfield');
  const [airspeed,setAirspeed] = useState(12);
  const [pitch,setPitch] = useState(8);
  const [rpm,setRpm] = useState(6400);
  const [heading,setHeading] = useState(0);
  const [altitude,setAltitude] = useState(100);
  const [diameter,setDiameter] = useState(.254);
  const [area,setArea] = useState(.047);
  const [cd,setCd] = useState(1.08);
  const [mass,setMass] = useState(1.55);
  const [running,setRunning] = useState(true);

  const model = useMemo(()=>{
    const rho = 1.225*Math.exp(-altitude/8500);
    const n = rpm/60;
    const q = .5*rho*airspeed*airspeed;
    const drag = q*cd*area;
    const thrust = 4*.102*rho*n*n*Math.pow(diameter,4);
    const vertical = thrust*Math.cos(pitch*Math.PI/180);
    const weight = mass*9.80665;
    const excess = vertical-weight;
    const power = 4*.047*rho*Math.pow(n,3)*Math.pow(diameter,5);
    const endurance = 77*60/Math.max(power,1);
    const reynolds = rho*Math.max(airspeed,.1)*diameter/1.81e-5;
    const side = drag*Math.sin(heading*Math.PI/180);
    const rollMoment = side*.23;
    return {rho,q,drag,thrust,vertical,weight,excess,power,endurance,reynolds,rollMoment};
  },[airspeed,pitch,rpm,heading,altitude,diameter,area,cd,mass]);

  const chooseScenario = (name:Scenario) => {
    const p=presets[name]; setScenario(name); setAirspeed(p.airspeed); setPitch(p.pitch); setRpm(p.rpm); setHeading(p.heading);
  };
  const exportData = () => {
    const rows = ['parameter,value,unit',`airspeed,${airspeed},m/s`,`pitch,${pitch},deg`,`rotor_speed,${rpm},rpm`,`air_density,${model.rho},kg/m3`,`drag,${model.drag},N`,`total_thrust,${model.thrust},N`,`excess_vertical_force,${model.excess},N`,`shaft_power,${model.power},W`,`reynolds_number,${model.reynolds},-`];
    const url=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'})); const a=document.createElement('a'); a.href=url; a.download='aeroforge-run.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">AF</span><span>AeroForge <b>/ QUAD</b></span></div>
      <nav aria-label="Simulation views"><button className={view==='Flowfield'?'active':''} onClick={()=>setView('Flowfield')}>Flowfield</button><button className={view==='Performance'?'active':''} onClick={()=>setView('Performance')}>Performance</button><button className={view==='Dynamics'?'active':''} onClick={()=>setView('Dynamics')}>Dynamics</button></nav>
      <div className="header-actions"><span className="model-state"><i/>MODEL READY</span><button className="export" onClick={exportData}>EXPORT CSV ↓</button></div>
    </header>

    <section className="workspace">
      <aside className="controls panel-scroll">
        <div className="eyebrow">FLIGHT ENVELOPE</div>
        <h1>Aerodynamic<br/>Workbench</h1>
        <p className="lede">Steady-state aerodynamics plus time-domain rigid-body flight dynamics for early quadcopter design.</p>
        <div className="presets" aria-label="Flight scenario">
          {(Object.keys(presets) as Scenario[]).map(s=><button key={s} className={scenario===s?'active':''} onClick={()=>chooseScenario(s)}>{s}</button>)}
        </div>
        <div className="section-rule"><span>CONDITIONS</span></div>
        <Range label="Airspeed" value={airspeed} min={0} max={30} step={.5} unit="m/s" onChange={v=>{setAirspeed(v);setScenario('Cruise')}}/>
        <Range label="Body pitch" value={pitch} min={-20} max={30} unit="°" onChange={setPitch}/>
        <Range label="Wind heading" value={heading} min={-90} max={90} unit="°" onChange={setHeading}/>
        <Range label="Altitude" value={altitude} min={0} max={4000} step={50} unit="m" onChange={setAltitude}/>
        <div className="section-rule"><span>VEHICLE</span></div>
        <Range label="Rotor speed" value={rpm} min={3000} max={10000} step={100} unit="rpm" onChange={setRpm}/>
        <Range label="Prop diameter" value={diameter} min={.18} max={.38} step={.002} unit="m" onChange={setDiameter}/>
        <Range label="Reference area" value={area} min={.02} max={.12} step={.001} unit="m²" onChange={setArea}/>
        <Range label="Drag coefficient" value={cd} min={.5} max={1.8} step={.01} unit="Cᴅ" onChange={setCd}/>
        <Range label="Mass" value={mass} min={.5} max={4} step={.05} unit="kg" onChange={setMass}/>
      </aside>

      <section className="center-stage">
        {view==='Flowfield' ? <>
          <div className="stage-label"><span>3D FLOWFIELD <b>·</b> {scenario.toUpperCase()}</span><strong>STREAMLINES / WAKE / DOWNWASH</strong></div>
          <FlowFieldScene airspeed={airspeed} pitch={pitch} heading={heading} rpm={rpm} drag={model.drag} thrust={model.thrust} running={running}/>
          <button className="sim-toggle" aria-pressed={running} onClick={()=>setRunning(!running)}>{running?'Ⅱ  PAUSE FLOW':'▶  RUN FLOW'}</button>
          <div className="axis"><span className="axis-x">X</span><span className="axis-y">Y</span><span className="axis-z">Z</span><i/></div>
          <div className="flow-legend"><span><i className="cyan"/>Streamline</span><span><i className="orange"/>Pressure</span><span><i className="vector"/>Force</span></div>
        </> : view==='Performance' ? <div className="performance-view">
          <div className="performance-title"><div><span>PERFORMANCE ENVELOPE</span><h2>Load response</h2></div><p>Current configuration swept through the forward-flight range.</p></div>
          <SweepChart rho={model.rho} cd={cd} area={area} current={airspeed}/>
          <div className="balance">
            <div className="balance-head"><span>VERTICAL FORCE BALANCE</span><b>{model.excess>=0?'POSITIVE MARGIN':'THRUST DEFICIT'}</b></div>
            <div className="balance-track"><i className="weight" style={{width:`${Math.min(100,model.weight/Math.max(model.thrust,model.weight)*100)}%`}}/><i className="thrust" style={{width:`${Math.min(100,model.vertical/Math.max(model.thrust,model.weight)*100)}%`}}/></div>
            <div className="balance-labels"><span>Weight {model.weight.toFixed(1)} N</span><span>Vertical thrust {model.vertical.toFixed(1)} N</span></div>
          </div>
          <div className="equation-note"><span>MODEL BASIS</span><p>T = 4C<sub>T</sub>ρn²D⁴ · D = ½ρV²C<sub>D</sub>A</p><small>Quasi-steady estimate. Ground effect, blade flapping, motor efficiency and frame interference are not resolved.</small></div>
        </div> : <FlightDynamics baseRpm={rpm} mass={mass} rho={model.rho} diameter={diameter}/>} 
      </section>

      <aside className="telemetry panel-scroll">
        <div className="eyebrow">AERO LOADS</div>
        <div className="metric hero"><span>PARASITIC DRAG</span><strong>{model.drag.toFixed(2)}</strong><small>N</small></div>
        <div className="delta"><i className={model.excess>=0?'ok':'warn'}/>{model.excess>=0?'THRUST RESERVE':'INSUFFICIENT THRUST'} · {Math.abs(model.excess).toFixed(1)} N</div>
        <div className="metric-grid">
          <div className="metric"><span>TOTAL THRUST</span><strong>{model.thrust.toFixed(1)}</strong><small>N</small></div>
          <div className="metric"><span>VERTICAL</span><strong>{model.vertical.toFixed(1)}</strong><small>N</small></div>
          <div className="metric"><span>DYN. PRESSURE</span><strong>{model.q.toFixed(1)}</strong><small>Pa</small></div>
          <div className="metric"><span>ROLL MOMENT</span><strong>{model.rollMoment.toFixed(2)}</strong><small>N·m</small></div>
        </div>
        <div className="section-rule"><span>PROPULSION</span></div>
        <div className="readout-row"><span>SHAFT POWER</span><b>{model.power.toFixed(0)} W</b></div>
        <div className="readout-row"><span>EST. ENDURANCE</span><b>{model.endurance.toFixed(1)} min</b></div>
        <div className="readout-row"><span>DISK LOADING</span><b>{(model.thrust/(4*Math.PI*Math.pow(diameter/2,2))).toFixed(1)} N/m²</b></div>
        <div className="section-rule"><span>ATMOSPHERE</span></div>
        <div className="readout-row"><span>AIR DENSITY</span><b>{model.rho.toFixed(3)} kg/m³</b></div>
        <div className="readout-row"><span>REYNOLDS No.</span><b>{model.reynolds.toExponential(2)}</b></div>
        <div className="confidence"><span>ANALYTICAL MODEL</span><b>REAL-TIME</b><div><i/><i/><i/><i/><i/></div></div>
      </aside>
    </section>
  </main>;
}

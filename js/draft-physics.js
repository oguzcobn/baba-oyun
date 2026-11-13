/* Draft possession engine v1 — event-based football simulation, no fixed final score.
 * Pitch: 105 x 68. Players press, find space, pass, intercept and shoot.
 * Ratings are broad proxies, not real-world player tracking data. */
const DraftPhysics=(()=>{
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),random=Math.random;
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const POS={KL:[5,34],ST:[24,34],BK:[30,12],OS:[52,34],KN:[69,14],FV:[83,34]};
 const setup=(team,dir)=>team.xi.map((p,i)=>{
   const same=team.xi.slice(0,i).filter(z=>z.pos===p.pos).length;
   const n=team.xi.filter(z=>z.pos===p.pos).length;
   const base=POS[p.pos]||[50,34];
   const x=dir===1?base[0]:105-base[0];
   const y=n===1?34:clamp(34+(same-(n-1)/2)*Math.min(23,48/n),4,64);
   return {name:p.name,pos:p.pos,r:p.r||70,x,y,homeX:x,homeY:y,dir};
 });
 const approach=(p,target,step)=>{const d=dist(p,target)||1;p.x=clamp(p.x+(target.x-p.x)*Math.min(1,step/d),1,104);p.y=clamp(p.y+(target.y-p.y)*Math.min(1,step/d),2,66)};
 const rating=p=>clamp((p.r||70)/100,.45,.99);
 const chance=(x)=>random()<clamp(x,.01,.98);
 const weighted=(arr,fn)=>{const weights=arr.map(p=>Math.max(.01,fn(p))),sum=weights.reduce((a,b)=>a+b,0);let r=random()*sum;return arr.find((p,i)=>(r-=weights[i])<=0)||arr[arr.length-1]};
 function simulate(home,away,opts={}){
   const teams=[setup(home,1),setup(away,-1)];
   const score=[0,0],events=[],shots=[0,0],on=[0,0],xg=[0,0],passes=[0,0],completed=[0,0],interceptions=[0,0];
   const power=t=>t.reduce((s,p)=>s+p.r,0)/Math.max(1,t.length);
   const strengths=teams.map(power);
   const possession=[0,0];
   const tempo=clamp(opts.tempo||1,.7,1.4),press=clamp(opts.press||1,.65,1.5);
   // Independent attacking sequences over 90 minutes. Outcomes emerge from the actions.
   const sequences=Math.round(46*tempo);
   for(let seq=0;seq<sequences;seq++){
     const minute=clamp(Math.floor(seq*90/sequences+random()*3),1,90);
     const side=chance(clamp(.5+(strengths[0]-strengths[1])*.008+(opts.homeBoost||.035),.3,.7))?0:1;
     const a=teams[side],d=teams[1-side],dir=side===0?1:-1;
     possession[side]++;
     const outfield=a.filter(p=>p.pos!=='KL'),defenders=d.filter(p=>p.pos!=='KL');
     let holder=weighted(outfield,p=>(p.pos==='OS'?3:p.pos==='ST'?2:1)*rating(p));
     let ball={x:dir===1?32:73,y:clamp(holder.y,8,60)};
     holder.x=ball.x;holder.y=ball.y;
     const trail=[{type:'receive',player:holder.name,x:ball.x,y:ball.y,min:minute}];
     let lastPass=null,turnover=false;
     const steps=3+Math.floor(random()*5);
     for(let k=0;k<steps;k++){
       const goal={x:dir===1?105:0,y:34};
       // Defensive shape follows the ball; closest defenders close down carrier.
       defenders.forEach(p=>{
         const target={x:clamp(p.homeX+(ball.x-p.homeX)*.25,2,103),y:clamp(p.homeY+(ball.y-p.homeY)*.33,3,65)};
         approach(p,target,4.5*press);
       });
       const nearest=defenders.slice().sort((p,q)=>dist(p,ball)-dist(q,ball))[0];
       const pressure=clamp((14-dist(nearest,ball))/14,0,1);
       const attackDist=Math.abs(goal.x-ball.x);
       // A real dribble risks losing possession.
       if(k>0&&chance(.035+pressure*(.14+(1-rating(holder))*.18))){
         interceptions[1-side]++;trail.push({type:'tackle',player:nearest.name,x:ball.x,y:ball.y,min:minute});turnover=true;break;
       }
       if(attackDist<32 && (k===steps-1||chance(.27+(32-attackDist)*.01))){
         const angle=Math.atan2(Math.abs(ball.y-34),Math.max(1,attackDist));
         const keeper=d.find(p=>p.pos==='KL')||{r:70};
         const x=clamp(.34*Math.exp(-attackDist/22)*Math.max(.22,Math.cos(angle))*(.7+rating(holder))*(1-pressure*.5),.015,.42);
         shots[side]++;xg[side]+=x;
         const target=chance(clamp(.32+rating(holder)*.5-pressure*.25,.25,.85));
         if(target)on[side]++;
         const goalMade=target&&chance(clamp(x/(.32+rating(holder)*.5-pressure*.25)*(1-(rating(keeper)-.7)*.25),.015,.75));
         const outcome=goalMade?'goal':target?'save':chance(.3)?'block':'miss';
         trail.push({type:'shot',player:holder.name,x:ball.x,y:ball.y,xg:x,outcome,min:minute});
         if(goalMade){score[side]++;events.push({t:side===0?'h':'a',sc:holder.name,as:lastPass,min:minute,trail:trail.slice(),xg:x});}
         turnover=true;break;
       }
       const options=outfield.filter(p=>p!==holder);
       const receiver=weighted(options,p=>{
         const forward=(p.x-ball.x)*dir;
         const open=Math.min(...defenders.map(q=>dist(q,p)));
         return Math.max(.08,2+forward*.075+open*.09-dist(p,ball)*.03)*(p.pos==='FV'?1.25:1);
       });
       const target={x:clamp(receiver.x+dir*(4+random()*10),2,103),y:clamp(receiver.y+(random()-.5)*8,3,65)};
       const length=dist(ball,target);
       const passing=clamp(.94-length*.005-pressure*.20+(rating(holder)-.7)*.18,.35,.96);
       passes[side]++;
       if(!chance(passing)){
         interceptions[1-side]++;trail.push({type:'interception',player:nearest.name,x:target.x,y:target.y,min:minute});turnover=true;break;
       }
       completed[side]++;trail.push({type:'pass',player:holder.name,to:receiver.name,x:ball.x,y:ball.y,tx:target.x,ty:target.y,min:minute});
       lastPass=holder.name;holder=receiver;approach(holder,target,18);ball={x:target.x,y:target.y};
     }
     if(!turnover&&chance(.22)){
       const goal={x:dir===1?105:0,y:34},dd=Math.abs(goal.x-ball.x),x=clamp(.14*Math.exp(-dd/28),.01,.16);
       shots[side]++;xg[side]+=x;const target=chance(.4);if(target)on[side]++;
       const made=target&&chance(x/.4);
       if(made){score[side]++;events.push({t:side===0?'h':'a',sc:holder.name,as:lastPass,min:minute,trail:trail.concat([{type:'shot',player:holder.name,x:ball.x,y:ball.y,xg:x,outcome:'goal',min:minute}]),xg:x});}
     }
   }
   events.sort((a,b)=>a.min-b.min);
   return {gh:score[0],ga:score[1],ev:events,stats:{shots,on,xg,passes,completed,interceptions,possession:possession.map(v=>Math.round(v*100/sequences))}};
 }
 return {simulate};
})();

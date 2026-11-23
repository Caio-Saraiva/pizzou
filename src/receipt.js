import {fraction} from './voting.js';
export async function createReceipt(state,result,t){
  await document.fonts.ready;
  const canvas=document.createElement('canvas');
  const measure=document.createElement('canvas').getContext('2d');
  const family='"DM Sans", "Noto Sans CJK SC", sans-serif';
  function wrap(value,max=366){
    measure.font=`15px ${family}`;
    const lines=[];let line='';
    for(const word of value.split(/\s+/)){
      const candidate=line?`${line} ${word}`:word;
      if(measure.measureText(candidate).width<=max){line=candidate;continue;}
      if(line){lines.push(line);line='';}
      for(const char of word){if(measure.measureText(line+char).width>max){lines.push(line);line='';}line+=char;}
    }
    if(line)lines.push(line);return lines;
  }
  const plan=result.flavorPlan;
  const names=plan?Object.fromEntries(plan.flavors.map(x=>[x.id,`${x.name}${x.veggie ? ` [${t.flavor.veggie}]` : ''}`])):{};
  const groups=plan?plan.pizzas.map(group=>({title:`${group.count} × ${t.sizeNames[state.size]}`,lines:group.portions.flatMap(p=>wrap(`${fraction(p.units,plan.parts)} ${names[p.id]}`.trim()))})):result.items.map(item=>({title:`${item.count} × ${t.sizeNames[item.id]}`,lines:[`${item.slices} ${t.slices}`]}));
  if(plan?.veggiePizzaCount) groups.push({title:t.flavor.veggie,lines:wrap(t.flavor.veggieNote)});
  const orderTop=plan?350:334;
  const orderHeight=Math.max(72,groups.reduce((sum,g)=>sum+32+g.lines.length*22+16,0));
  const divider=orderTop+orderHeight+12,totalY=divider+36,footerLine=totalY+88;
  const cutY=footerLine+108,height=cutY+25;
  canvas.width=960;canvas.height=height*2;
  const ctx=canvas.getContext('2d');ctx.scale(2,2);
  ctx.fillStyle='#f3eee2';ctx.fillRect(0,0,480,height);
  ctx.fillStyle='#fffdf6';ctx.beginPath();ctx.moveTo(22,12);ctx.lineTo(458,12);ctx.lineTo(458,cutY);
  for(let x=458;x>=22;x-=12){ctx.lineTo(x-6,cutY+10);ctx.lineTo(x-12,cutY);}ctx.closePath();ctx.fill();
  const text=(value,x,y,size=16,weight=400,align='left',color='#302c25',mono=false)=>{ctx.fillStyle=color;ctx.font=`${weight} ${size}px ${mono?'monospace':family}`;ctx.textAlign=align;ctx.fillText(value,x,y);};
  const line=y=>{ctx.strokeStyle='#c9c1b3';ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(48,y);ctx.lineTo(432,y);ctx.stroke();ctx.setLineDash([]);};
  text('pizzou',240,74,42,900,'center','#e64627');text(t.receiptTitle,240,108,state.lang==='fr'?18:21,800,'center');text(t.order,240,138,12,600,'center','#706b60',true);line(162);
  text(t.group,48,191,12,700,'left','#706b60');text(`${state.people.length} ${state.people.length===1?t.personUnit:t.peopleUnit}`,432,191,16,700,'right');
  let y=221;state.portions.forEach((portions,level)=>{const count=state.people.filter(hunger=>hunger===level).length;if(count){text(`${count} × ${t.hunger[level]}`,48,y,15);text(`${portions} ${t.slices}`,432,y,15,400,'right','#706b60');y+=27;}});
  line(303);if(plan)text(t.flavor.resultSummary,48,327,12,700,'left','#706b60');
  y=orderTop;for(const group of groups){text(group.title,48,y,21,700);y+=28;for(const value of group.lines){text(value,58,y,15,400,'left','#706b60');y+=22;}y+=20;}
  line(divider);text(t.total,48,totalY,14,700);text(`${result.count} ${result.count===1?t.pizza:t.pizzas}`,432,totalY+2,27,800,'right','#e64627');
  text(t.needed,48,totalY+35,14);text(`${result.demand} ${t.slices}`,432,totalY+35,14,600,'right');text(t.surplus,48,totalY+64,14);text(`${result.extra}`,432,totalY+64,14,600,'right');
  line(footerLine);text(t.enjoy,240,footerLine+37,19,700,'center');text('pizza.lilbigcheetos.com',240,footerLine+62,12,400,'center','#706b60',true);text(t.estimate,240,footerLine+85,10,400,'center','#706b60');
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('PNG generation failed')),'image/png'));
  return {blob,url:URL.createObjectURL(blob)};
}

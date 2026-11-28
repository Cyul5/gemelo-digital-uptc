/* UPTC GIC — campus navigation and data overview. No additional data source. */
(() => {
  const $=id=>document.getElementById(id);
  const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function inventory(){return [...new Map(Object.values(registrosInventarioExcel||{}).filter(x=>x&&x.codigo).map(x=>[String(x.codigo).toUpperCase(),x])).values()];}
  function make(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
  const dialog=make('dialog','gic-campus-dialog'); dialog.id='gic-campus-dialog';
  dialog.innerHTML='<header class="gic-campus-heading"><div><small>UPTC GIC · CAMPUS</small><h2 id="gic-campus-title"></h2></div><button type="button" id="gic-campus-close" aria-label="Cerrar">×</button></header><div id="gic-campus-body"></div>';
  document.body.append(dialog);dialog.setAttribute('aria-labelledby','gic-campus-title');
  let previousFocus;
  $('gic-campus-close').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>previousFocus?.focus());
  function open(title){previousFocus=document.activeElement;$('gic-campus-title').textContent=title;$('gic-campus-body').replaceChildren();if(!dialog.open)dialog.showModal();return $('gic-campus-body');}
  function goBuilding(ed){dialog.close();irAVista('vista-mapa');requestAnimationFrame(()=>zoomAEdificio(ed));}
  function goSpace(code,piso){
    if(dialog.open)dialog.close();
    const p=String(piso||'').match(/\d+/);
    if(!p){irAVista('vista-mapa');return;}
    const level=Number(p[0]);if(level<1||level>5)return;
    fijarEdificio('hunza');window.irAVista2DPiso(level===5?'Piso 5 / Cubierta':'Piso '+level);
    const obj=$('svg-2d-object');if(!obj)return;
    obj.addEventListener('load',()=>{setTimeout(()=>{if($('svg-2d-object')!==obj)return;const target=Array.from(obj.contentDocument?.querySelectorAll('[id]')||[]).find(el=>normalize(el.id)===normalize(code));if(target)target.dispatchEvent(new MouseEvent('click',{bubbles:true}));else {aulaSeleccionadaActual=String(code).toUpperCase();mostrarDetalleAulaPanel(aulaSeleccionadaActual);}window.GIC_MOVIL?.expandirPanel?.();},180);},{once:true});
  }
  function search(){
    const body=open('Buscar en el campus');const inp=make('input','gic-campus-input');inp.placeholder='Edificio, código de aula o uso…';inp.setAttribute('aria-label','Buscar');body.append(inp);
    const results=make('div','gic-campus-results');body.append(results);
    function render(){const q=normalize(inp.value);results.replaceChildren();
      const list=[...EDIFICIOS_CAMPUS.map(ed=>({title:ed.nombre,meta:'Edificio '+ed.cod+(ed.svgId?'':' · Sin geometría vinculada'),fn:()=>goBuilding(ed)})),...inventory().map(x=>({title:String(x.codigo),meta:[x.piso,x.uso||x.categoria].filter(Boolean).join(' · '),fn:()=>goSpace(x.codigo,x.piso)})),{title:'Galería del levantamiento',meta:'Evidencia fotográfica',fn:()=>{dialog.close();abrirGaleria();}},{title:'Mantenimiento de equipos',meta:'EDILAB · Acceso autorizado',fn:()=>{location.href='solicitudes.html';}}];
      const matching=list.filter(x=>normalize(x.title+' '+x.meta).includes(q));
      matching.slice(0,40).forEach(x=>{const b=make('button','gic-campus-result');b.type='button';b.append(make('strong','',x.title),make('small','',x.meta),make('span','gic-result-arrow','›'));b.onclick=x.fn;results.append(b);});
      if(!matching.length)results.append(make('p','gic-campus-empty','No se encontraron resultados.'));
      else if(matching.length>40)results.append(make('p','gic-campus-empty','Escribe más detalles para acotar '+matching.length+' resultados.'));
    }
    inp.addEventListener('input',render);render();inp.focus();
  }
  function dashboard(){const body=open('Resumen del campus');const rows=inventory();const grid=make('div','gic-campus-metrics');
    const data=[['Edificios y puntos del catálogo',EDIFICIOS_CAMPUS.length],['Con geometría vinculada',EDIFICIOS_CAMPUS.filter(x=>x.svgId).length],['Espacios en inventario',rows.length||'Sin datos cargados'],['Registros de horarios',(registrosHorariosExcel||[]).length||'Sin datos cargados']];
    data.forEach(([k,v])=>{const el=make('div','gic-campus-metric');el.append(make('small','',k),make('strong','',String(v)));grid.append(el);});body.append(grid);
    body.append(make('p','gic-campus-empty','Datos del catálogo y Excel de esta sesión. Los registros de horarios no representan ocupación en tiempo real.'));
    const counts=new Map();rows.forEach(x=>{const k=String(x.piso||'Sin piso');counts.set(k,(counts.get(k)||0)+1);});
    if(counts.size){body.append(make('h3','','Espacios registrados por piso'));const max=Math.max(...counts.values());for(const [k,v] of [...counts].sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true}))){const el=make('div','gic-campus-bar');el.append(make('span','',k),make('strong','',String(v)));const bar=make('i');bar.style.width=(v/max*100)+'%';el.append(bar);body.append(el);}}
    const b=make('button','gic-campus-result','Explorar mapa del campus →');b.onclick=()=>{dialog.close();irAVista('vista-mapa');};body.append(b);
    const mantenimiento=make('a','gic-campus-result','Mantenimiento y solicitudes EDILAB →');mantenimiento.href='solicitudes.html';body.append(mantenimiento);
    body.append(make('p','gic-campus-empty','Sensores IoT y rutas accesibles: sin fuentes verificadas disponibles.'));
  }
  $('gic-open-search').onclick=search;$('gic-open-dashboard').onclick=dashboard;
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();search();}});
  const plan=$('vista-2d');const legend=make('div','gic-plan-legend');legend.id='gic-plan-legend';legend.setAttribute('aria-label','Leyenda del plano');plan.querySelector('.gic-plan-toolbar').append(legend);
  const labels=make('button','gic-plan-extra','Etiquetas');labels.type='button';labels.setAttribute('aria-pressed','false');
  const share=make('button','gic-plan-extra','Compartir plano');share.type='button';
  legend.append(labels,share);
  let labelsOn=false;
  const keys=make('div','gic-plan-keys');legend.prepend(keys);
  function paintLegend(){keys.replaceChildren();const lab=edificioActual==='lab',modo=$('select-modo-consulta').value;
    const items=lab?[['#0284c7','Laboratorio'],['#ea580c','Equipos']]:modo==='horarios'?[['#ef4444','Ocupado'],['#10b981','Libre según horario']]:modo==='mobiliario'?[['#a855f7','Mobiliario']]:[['#eab308','Estado regular'],['#00b4d8','Otros espacios']];
    items.forEach(([c,t])=>{const el=make('span','gic-plan-key');const sw=make('i');sw.style.background=c;el.append(sw,document.createTextNode(t));keys.append(el);});
  }
  function paintLabels(){const obj=$('svg-2d-object'),doc=obj?.contentDocument;if(!doc?.documentElement)return;doc.getElementById('gic-space-labels')?.remove();if(!labelsOn||edificioActual==='lab')return;
    const ns='http://www.w3.org/2000/svg',group=doc.createElementNS(ns,'g');group.id='gic-space-labels';group.setAttribute('pointer-events','none');
    const vb=doc.documentElement.viewBox.baseVal;const font=Math.max(1,vb.width/100);
    doc.querySelectorAll('[id^="A-"],[id^="a-"],[id^="L-"],[id^="l-"]').forEach(el=>{try{const b=el.getBBox(),m=el.getCTM(),root=doc.documentElement.getCTM();if(!m||!root||!b.width||!b.height)return;const p=new DOMPoint(b.x+b.width/2,b.y+b.height/2).matrixTransform(root.inverse().multiply(m));const t=doc.createElementNS(ns,'text');t.textContent=el.id;t.setAttribute('x',p.x);t.setAttribute('y',p.y);t.setAttribute('font-size',font);t.setAttribute('text-anchor','middle');t.setAttribute('fill','#075985');t.setAttribute('stroke','#fff');t.setAttribute('stroke-width',font/7);t.setAttribute('paint-order','stroke');group.append(t);}catch(e){}});
    doc.documentElement.append(group);
  }
  labels.onclick=()=>{labelsOn=!labelsOn;labels.setAttribute('aria-pressed',String(labelsOn));paintLabels();};
  share.onclick=async()=>{const u=new URL(location.href);u.searchParams.set('gicEd',edificioActual);u.searchParams.set('gicPiso',pisoActual2D);if(aulaSeleccionadaActual)u.searchParams.set('gicAula',aulaSeleccionadaActual);else u.searchParams.delete('gicAula');try{await navigator.clipboard.writeText(u.href);share.textContent='Copiado';setTimeout(()=>share.textContent='Compartir plano',1500);}catch{window.prompt('Copia este enlace:',u.href);}};
  function hookPlan(){paintLegend();const o=$('svg-2d-object');if(o){o.addEventListener('load',()=>{paintLegend();paintLabels();},{once:true});}}
  new MutationObserver(hookPlan).observe($('svg-2d-wrapper'),{childList:true});
  $('select-modo-consulta').addEventListener('change',paintLegend);$('select-edificio-2d').addEventListener('change',paintLegend);hookPlan();
  const p=new URLSearchParams(location.search);if(p.has('gicEd')&&p.has('gicPiso')){window.addEventListener('load',()=>{const ed=p.get('gicEd')==='lab'?'lab':'hunza';const piso=p.get('gicPiso');if(!/^Piso [1-5]( \/ Cubierta)?$/.test(piso))return;$('welcome-overlay')?.classList.remove('show');fijarEdificio(ed);if(ed==='hunza'&&p.get('gicAula')&&/^[A-Z0-9 -]{1,30}$/i.test(p.get('gicAula')))goSpace(p.get('gicAula'),piso);else window.irAVista2DPiso(piso);},{once:true});}
})();

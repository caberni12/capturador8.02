const API="https://script.google.com/macros/s/AKfycbzC_qrSyXeTw9NcO40ap4x2cfs3FZIBKqMZLV9kKhYYh7n2XTPAuj1Vb2ckpFBWi8Ys/exec";

/* ===================== ESTADO GLOBAL ===================== */
let productos=[];
let capturas=JSON.parse(localStorage.getItem("capturas")||"[]");

let scannerActivo=null;
let scannerTarget=null;
let torch=false;
let editIndex=-1;

/* ===== IMPORTACIÓN PERSISTENTE ===== */
let bufferImportacion = JSON.parse(localStorage.getItem("bufferImportacion")||"null");
let estadoImportacion = JSON.parse(localStorage.getItem("estadoImportacion")||"null");

/* ===================== CARGA INICIAL ===================== */
operador.value=localStorage.getItem("operador")||"";
ubicacion.value=localStorage.getItem("ubicacion")||"";

fetch(API)
.then(r=>r.json())
.then(d=>{
  productos=d;
  localStorage.setItem("productos",JSON.stringify(d));
})
.catch(()=>{
  const c=localStorage.getItem("productos");
  if(c) productos=JSON.parse(c);
});

render();

/* ===== RESTAURAR IMPORTACIÓN ===== */
if(estadoImportacion && estadoImportacion.enProceso){
  openTab("importar");
  barra.style.width=estadoImportacion.progreso+"%";
  mensaje.innerText=estadoImportacion.mensaje;
}

/* ===================== TABS ===================== */
function openTab(id){
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
}

/* ===================== CAPTURADOR ===================== */
function limpiarUbicacion(){
  ubicacion.value="";
  localStorage.removeItem("ubicacion");
  previewIngreso();
}

function buscarDescripcion(){
  const c=codigo.value.trim().toLowerCase();
  if(!c) return;
  const p=productos.find(x=>String(x.CODIGO).toLowerCase()===c);
  if(p){
    descripcion.value=p.DESCRIPCION||"";
    cantidad.value=1;
  }
}

function previewIngreso(){
  if(!codigo.value && !descripcion.value){
    preview.innerHTML="";
    return;
  }
  preview.innerHTML=`
  <div class="row preview">
    <b>🕒 PREVISUALIZANDO</b><br><br>
    <b>${codigo.value||"-"}</b> – ${descripcion.value||"-"}<br>
    <span class="small">
      ${ubicacion.value||"SIN UBICACIÓN"} |
      ${operador.value||"-"} |
      Cant: ${cantidad.value}
    </span>
  </div>`;
}

/* ===================== SCANNER DINÁMICO ===================== */
function activarScan(tipo){
  cerrarScanner();

  scannerTarget=tipo;
  const cont=document.getElementById("scanner-"+tipo);

  cont.innerHTML=`
    <div id="scannerBox">
      <div class="scan-frame"></div>
      <div class="scan-line"></div>
    </div>
  `;

  scannerActivo=new Html5Qrcode("scannerBox");

  scannerActivo.start(
    {facingMode:"environment"},
    {
      fps:12,
      qrbox:(vw,vh)=>{
        const s=Math.min(vw,vh)*0.55;
        return{width:s,height:s};
      },
      formatsToSupport:[
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13
      ]
    },
    txt=>{
      beep.play();
      navigator.vibrate?.(200);

      if(scannerTarget==="codigo"){
        codigo.value=txt;
        buscarDescripcion();
      }

      if(scannerTarget==="ubicacion"){
        ubicacion.value=txt;
        localStorage.setItem("ubicacion",txt);
      }

      previewIngreso();
      cerrarScanner();
    }
  );
}

function cerrarScanner(){
  if(!scannerActivo) return;
  scannerActivo.stop().then(()=>{
    scannerActivo.clear();
    scannerActivo=null;
    scannerTarget=null;
    document.querySelectorAll(".scanner-slot").forEach(d=>d.innerHTML="");
  });
}

/* ===================== GUARDAR ===================== */
function ingresar(){
  if(!codigo.value.trim()){
    alert("❌ Digite un código válido");
    return;
  }

  localStorage.setItem("operador",operador.value);
  ubicacion.value
    ? localStorage.setItem("ubicacion",ubicacion.value)
    : localStorage.removeItem("ubicacion");

  const d={
    Fecha:new Date().toLocaleString(),
    Operador:operador.value||"",
    Ubicación:ubicacion.value||"SIN UBICACIÓN",
    Código:codigo.value,
    Descripción:descripcion.value,
    Cantidad:Number(cantidad.value)
  };

  editIndex>=0 ? capturas[editIndex]=d : capturas.push(d);
  editIndex=-1;

  localStorage.setItem("capturas",JSON.stringify(capturas));
  limpiar();
  render();
}

function limpiar(){
  codigo.value="";
  descripcion.value="";
  cantidad.value=1;
  preview.innerHTML="";
}

/* ===================== RENDER ===================== */
function render(){
  tabla.innerHTML="";
  let total=0;

  capturas.forEach((c,i)=>{
    total+=Number(c.Cantidad)||0;
    tabla.innerHTML+=`
    <div class="row">
      <button class="delbtn" onclick="event.stopPropagation();eliminarItem(${i})">×</button>
      <div onclick="cargarParaEditar(${i})">
        <b>${c.Código}</b> – ${c.Descripción}<br>
        <span class="small">
          ${c.Ubicación} | ${c.Operador} | ${c.Fecha} | Cant: ${c.Cantidad}
        </span>
      </div>
    </div>`;
  });

  totalizador.innerText="Total unidades: "+total;
}

function cargarParaEditar(i){
  const c=capturas[i];
  operador.value=c.Operador;
  ubicacion.value=c.Ubicación==="SIN UBICACIÓN"?"":c.Ubicación;
  codigo.value=c.Código;
  descripcion.value=c.Descripción;
  cantidad.value=c.Cantidad;
  editIndex=i;
  previewIngreso();
  render();
  window.scrollTo({top:0,behavior:"smooth"});
}

function eliminarItem(i){
  if(!confirm("¿Eliminar este registro?")) return;
  capturas.splice(i,1);
  localStorage.setItem("capturas",JSON.stringify(capturas));
  render();
}

function exportarPDF(){
    if(!capturas.length) return alert("Sin datos");
    const w = window.open("");
    let h = "<h3>Reporte de Captura</h3><table border='1' cellpadding='5' cellspacing='0'><tr>";
    Object.keys(capturas[0]).forEach(k=>h+="<th>"+k+"</th>");
    h+="</tr>";
    capturas.forEach(r=>{
     h+="<tr>";
     Object.values(r).forEach(v=>h+="<td>"+v+"</td>");
     h+="</tr>";
    });
    h+="</table>";
    w.document.write(h);
    w.print();
   }
  /* ===================== FINALIZAR ===================== */
  async function finalizar(){
   if(!capturas.length) return;
   const data=capturas.map(r=>({...r,Código:""+r.Código}));
   const ws=XLSX.utils.json_to_sheet(data);
   const wb=XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb,ws,"Captura");
   const blob=new Blob(
    [XLSX.write(wb,{bookType:"xlsx",type:"array"})],
    {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
   );
   const a=document.createElement("a");
   a.href=URL.createObjectURL(blob);
   a.download="captura.xlsx";
   a.click();
  
   localStorage.removeItem("capturas");
   capturas=[];
   limpiar();
   render();
   operador.value="";
  }
  
  /* ===================== IMPORTADOR ===================== */
  function importarMaestra(){
   const file=fileExcel.files[0];
   if(!file && bufferImportacion){
    mensaje.innerText="ℹ️ Archivo ya cargado. Continuando…";
    enviarMaestra(bufferImportacion);
    return;
   }
   if(!file) return alert("Selecciona Excel");
  
   const reader=new FileReader();
   reader.onload=e=>{
    const wb=XLSX.read(e.target.result,{type:"binary"});
    const data=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    bufferImportacion=data;
    localStorage.setItem("bufferImportacion",JSON.stringify(data));
    mensaje.innerText="✅ Archivo cargado. Importando…";
    enviarMaestra(data);
   };
   reader.readAsBinaryString(file);
  }
  
  async function enviarMaestra(data){
   estadoImportacion={enProceso:true,progreso:0,mensaje:"⏳ Importando..."};
   localStorage.setItem("estadoImportacion",JSON.stringify(estadoImportacion));
  
   barra.style.width="0%";
   mensaje.innerText=estadoImportacion.mensaje;
  
   let p=0;
   const t=setInterval(()=>{
    p+=10;
    barra.style.width=p+"%";
    estadoImportacion.progreso=p;
    localStorage.setItem("estadoImportacion",JSON.stringify(estadoImportacion));
    if(p>=90) clearInterval(t);
   },200);
  
   try{
    await fetch(API,{method:"POST",body:JSON.stringify({accion:"importar",data})});
    clearInterval(t);
    barra.style.width="100%";
    mensaje.innerText="✅ Importación de archivo exitosa";
    alert("✅ Importación de archivo exitosa");
  
    localStorage.removeItem("estadoImportacion");
    localStorage.removeItem("bufferImportacion");
    estadoImportacion=null;
    bufferImportacion=null;
    fileExcel.value="";
    productos=data;
  
   }catch(e){
    clearInterval(t);
    mensaje.innerText="❌ Error al importar";
   }
  }
  
  /* ===================== CONSULTA PRODUCTOS ===================== */
  let timerConsulta=null,filasConsulta=[],indexConsulta=-1;
  let startY=null;
  
  function abrirModalConsulta(){
   modalConsulta.classList.add("show");
   buscarConsulta.value="";
   resultadoConsulta.innerHTML="";
   scrollConsulta.style.display="none";
   msgConsulta.innerText="Escriba para consultar";
   filasConsulta=[];
   indexConsulta=-1;
   buscarConsulta.focus();
  }
  
  function cerrarModalConsulta(){
   modalConsulta.classList.remove("show");
  }
  
  function filtrarConsulta(){
   clearTimeout(timerConsulta);
   timerConsulta=setTimeout(filtrarConsultaReal,250);
  }
  
  function filtrarConsultaReal(){
   const q=buscarConsulta.value.trim().toLowerCase();
   resultadoConsulta.innerHTML="";
   filasConsulta=[];
   indexConsulta=-1;
  
   if(q.length<2){
    msgConsulta.innerText="Escriba al menos 2 caracteres";
    return;
   }
  
   let count=0;
   for(const p of productos){
    if(
     String(p.CODIGO).toLowerCase().includes(q) ||
     String(p.DESCRIPCION).toLowerCase().includes(q)
    ){
     const tr=document.createElement("tr");
     tr.innerHTML=`<td>${p.CODIGO}</td><td>${p.DESCRIPCION}</td>`;
     tr.addEventListener("click",()=>activarFilaConsulta(filasConsulta.indexOf(tr)));
     resultadoConsulta.appendChild(tr);
     filasConsulta.push(tr);
     if(++count>=50) break;
    }
   }
  
   if(!filasConsulta.length){
    msgConsulta.innerText="❌ Sin coincidencias";
    return;
   }
  
   scrollConsulta.style.display="block";
   activarFilaConsulta(0);
  }
  
  function activarFilaConsulta(i){
   if(i<0||i>=filasConsulta.length) return;
   filasConsulta.forEach(r=>r.classList.remove("selected"));
   filasConsulta[i].classList.add("selected");
   indexConsulta=i;
  
   const fila=filasConsulta[i];
   const cont=scrollConsulta;
   const top=fila.offsetTop;
   const bottom=top+fila.offsetHeight;
  
   if(top<cont.scrollTop) cont.scrollTop=top-8;
   else if(bottom>cont.scrollTop+cont.clientHeight)
    cont.scrollTop=bottom-cont.clientHeight+8;
  }
  
  /* ===== TECLADO ===== */
  document.addEventListener("keydown",e=>{
   if(!modalConsulta.classList.contains("show")) return;
   if(!filasConsulta.length) return;
  
   if(e.key==="ArrowDown"){
    e.preventDefault();
    activarFilaConsulta(Math.min(indexConsulta+1,filasConsulta.length-1));
   }
   if(e.key==="ArrowUp"){
    e.preventDefault();
    activarFilaConsulta(Math.max(indexConsulta-1,0));
   }
   if(e.key==="Escape"){
    cerrarModalConsulta();
   }
  });
  
  /* ===== SWIPE CELULAR ===== */
  scrollConsulta.addEventListener("touchstart",e=>{
   startY=e.touches[0].clientY;
  });
  scrollConsulta.addEventListener("touchmove",e=>{
   if(startY===null) return;
   const diff=startY-e.touches[0].clientY;
   if(Math.abs(diff)>40){
    diff>0
     ? activarFilaConsulta(Math.min(indexConsulta+1,filasConsulta.length-1))
     : activarFilaConsulta(Math.max(indexConsulta-1,0));
    startY=null;
   }
  });
  
  /* ===== EXPORTAR MAESTRA DE PRODUCTOS ===== */
  function exportarMaestraProductos(){
  
    if(!productos || !productos.length){
      alert("❌ No hay productos para exportar");
      return;
    }
    
    // Fuerza CODIGO como texto (muy importante)
    const data = productos.map(p => ({
      CODIGO: "" + String(p.CODIGO),
      DESCRIPCION: p.DESCRIPCION
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Maestra_Productos");
    
    const excel = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array"
    });
    
    const blob = new Blob([excel], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "maestra_productos.xlsx";
    a.click();
    
    URL.revokeObjectURL(url);
    }
    
  /* ===================== PROTEGER RECARGA ===================== */
  window.addEventListener("beforeunload",e=>{
   const est=JSON.parse(localStorage.getItem("estadoImportacion")||"null");
   if(est&&est.enProceso){
    e.preventDefault();
    e.returnValue="";
   }
  });


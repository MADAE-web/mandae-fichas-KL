 "use client";
import {useState} from "react";
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

type Field={label:string;value:string};
function find(text:string, patterns:RegExp[]){for(const p of patterns){const m=text.match(p);if(m?.[1])return m[1].trim()}return ""}
function extract(text:string){
 const clean=text.replace(/\s+/g," ").trim();
 const number=find(clean,[/(?:N[º°o]?\.?|Número)\s*[:\-]?\s*(\d{1,12})/i,/NF-e.*?(\d{1,12})/i]);
 const serie=find(clean,[/(?:Série|Serie)\s*[:\-]?\s*(\d{1,6})/i]);
 const cpf=find(clean,[/(?:CPF)\s*[:\-]?\s*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i]);
 const cnpj=find(clean,[/(?:CNPJ)\s*[:\-]?\s*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i]);
 const date=find(clean,[/(\d{2}\/\d{2}\/\d{4})/]);
 const total=find(clean,[/(?:Valor Total|Total da Nota|Valor a Pagar)\s*[:\-]?\s*R?\$?\s*([\d.,]+)/i]);
 const cep=find(clean,[/(?:CEP)\s*[:\-]?\s*(\d{5}-?\d{3})/i]);
 const phone=find(clean,[/(?:Telefone|Fone|Celular)\s*[:\-]?\s*(\(?\d{2}\)?\s*9?\d{4,5}-?\d{4})/i]);
 const key=find(clean,[/(?:Chave de Acesso|Chave)\s*[:\-]?\s*(\d{44})/i,/(\d{44})/]);
 return {number,serie,cpf:cpf||cnpj,date,total,cep,phone,key,raw:clean};
}
export default function Home(){
 const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[data,setData]=useState<ReturnType<typeof extract>|null>(null),[error,setError]=useState("");
 async function read(f:File){
  setFile(f);setBusy(true);setError("");setData(null);
  try{
   if(f.size>20*1024*1024)throw new Error("O PDF ultrapassa 20 MB.");
   const buf=await f.arrayBuffer();
   // Worker is loaded from the installed pdfjs distribution.
   const pdf=await pdfjsLib.getDocument({data:buf}).promise;
   let all="";
   for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const c=await page.getTextContent();all+=(c.items as any[]).map(x=>x.str||"").join(" ")+" ";}
   if(!all.trim())throw new Error("Este PDF não possui texto selecionável. Para notas escaneadas/fotografadas será necessário OCR.");
   setData(extract(all));
  }catch(e:any){setError(e?.message||"Não foi possível ler o PDF.")}finally{setBusy(false)}
 }
 const download=()=>{if(!data)return;const rows=[["Campo","Valor"],["Número da nota",data.number],["Série",data.serie],["CPF",data.cpf],["Data",data.date],["Telefone",data.phone],["CEP",data.cep],["Valor total",data.total],["Chave de acesso",data.key]];const csv=rows.map(r=>r.map(v=>`"${(v||"Não identificado").replaceAll('"','""')}"`).join(";")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv"}));a.download="mandae-nota.csv";a.click()};
 return <main><header><div className="brand"><span>M</span><div><b>MANDAÊ</b><small>LEITOR DE NOTAS</small></div></div></header>
 <section className="hero"><div><small>LEITOR DE NF-E / DANFE</small><h1>Envie o PDF e veja os dados da nota.</h1><p>O sistema lê o texto do PDF diretamente no navegador. Nenhum arquivo é enviado para um servidor nesta versão.</p></div></section>
 <section className="box">
  <label className="drop"><input type="file" accept=".pdf,application/pdf" onChange={e=>e.target.files?.[0]&&read(e.target.files[0])}/><div className="pdf">PDF</div><h2>{file?file.name:"Arraste ou clique para enviar a nota"}</h2><p>PDF de até 20 MB</p></label>
  {busy&&<div className="status">Lendo PDF e organizando os dados…</div>}
  {error&&<div className="error">{error}</div>}
 </section>
 {data&&<section className="result"><div className="resultHead"><div><small>RESULTADO DA LEITURA</small><h2>Dados encontrados</h2></div><button onClick={download}>Exportar CSV</button></div>
  <div className="cards">{[
   ["Número da nota",data.number],["Série",data.serie],["Data",data.date],["CPF/CNPJ",data.cpf||"Não identificado"],["Telefone",data.phone||"Não identificado"],["CEP",data.cep||"Não identificado"],["Valor total",data.total||"Não identificado"],["Chave de acesso",data.key||"Não identificada"]
  ].map(([a,b])=><div className="card" key={a}><small>{a}</small><strong>{b||"Não identificado"}</strong></div>)}</div>
  <div className="raw"><h3>Texto extraído do PDF</h3><p>{data.raw}</p></div>
  <div className="notice">⚠️ Os campos acima são identificados por padrões de texto. Se um campo não estiver no PDF ou estiver em um formato diferente, ele aparecerá como “Não identificado”. Dados como data de nascimento normalmente não constam na NF-e.</div>
 </section>}
 <footer>MANDAÊ • Leitor simples de notas fiscais</footer>
 </main>
}

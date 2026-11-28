const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
// Static syntax smoke test for page scripts, without executing application code.
const vm = require('node:vm');
const os = require('node:os');
const path = require('node:path');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'gic-check-'));
try {
  let count=0;
  for(const page of ['index.html','solicitudes.html']) {
    const html=fs.readFileSync(page,'utf8');
    for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if(/\bsrc\s*=|importmap|application\/json/i.test(m[1])) continue;
      if(/type\s*=\s*["']module["']/i.test(m[1])) {
        const p=path.join(tmp,'module-'+count+'.mjs'); fs.writeFileSync(p,m[2]); execFileSync(process.execPath,['--check',p],{stdio:'inherit'});
      } else new vm.Script(m[2],{filename:page+':script-'+count});
      count++;
    }
  }
  new vm.Script(fs.readFileSync('gic-campus.js','utf8'),{filename:'gic-campus.js'});
  console.log('GIC syntax validation: '+(count+1)+' scripts passed.');
} finally {fs.rmSync(tmp,{recursive:true,force:true});}

const original = 'EDIFICIO_AULAS_M3D.glb', optimized = 'EDIFICIO_AULAS_WEB.glb';
function inspect(path) {
  const b=fs.readFileSync(path);
  if(b.length<20 || b.readUInt32LE(0)!==0x46546c67 || b.readUInt32LE(4)!==2 || b.readUInt32LE(8)!==b.length || b.readUInt32LE(16)!==0x4e4f534a) throw Error('Invalid GLB: '+path);
  const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'));
  const primitives=(j.meshes||[]).flatMap(m=>m.primitives||[]);
  return {bytes:b.length,nodes:(j.nodes||[]).length,meshes:(j.meshes||[]).length,primitives:primitives.length,materials:(j.materials||[]).length,images:(j.images||[]).length,draco:primitives.filter(p=>p.extensions?.KHR_draco_mesh_compression).length,extensions:j.extensionsRequired||[]};
}
const before=inspect(original);
console.log('GIC original:',JSON.stringify(before));
execFileSync('npx',['--yes','@gltf-transform/cli@4.5.1','draco',original,optimized,'--method','edgebreaker','--quantize-position','16','--quantize-normal','14','--quantize-texcoord','14','--quantize-color','12','--quantize-generic','16','--quantization-volume','mesh','--decode-speed','7'],{stdio:'inherit',timeout:480000});
const after=inspect(optimized);
console.log('GIC optimized:',JSON.stringify(after));
if(after.bytes>=before.bytes || !after.draco || before.nodes!==after.nodes || before.meshes!==after.meshes || before.primitives!==after.primitives || before.materials!==after.materials || before.images!==after.images) throw Error('GLB structural or size check failed; refusing optimized deployment.');
const report={original,optimized,before,after,reductionPercent:Math.round((1-after.bytes/before.bytes)*10000)/100};
fs.writeFileSync('gic-model-report.json',JSON.stringify(report,null,2));
console.log('GIC model report:',JSON.stringify(report));

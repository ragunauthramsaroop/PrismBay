import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

// Original geometric app mark rendered locally, without external dependencies.
const folder = resolve(process.cwd(), 'public/icons');
mkdirSync(folder, { recursive: true });
function crc32(bytes) {
  let crc = ~0;
  for (const b of bytes) {
    crc ^= b;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (~crc) >>> 0;
}
function chunk(type, value) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4); length.writeUInt32BE(value.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([name,value])));
  return Buffer.concat([length,name,value,checksum]);
}
function draw(size) {
  const bytes = Buffer.alloc(size * (1 + size * 4));
  const sx = v => v * size;
  function segment(px,py,x0,y0,x1,y1,width) {
    const vx = x1-x0, vy = y1-y0, denom = vx*vx+vy*vy;
    const t = Math.max(0,Math.min(1,((px-x0)*vx+(py-y0)*vy)/denom));
    const dx=px-(x0+t*vx), dy=py-(y0+t*vy);
    return dx*dx+dy*dy < width*width/4;
  }
  for (let y=0; y<size; y++) {
    const off = y*(1+size*4); bytes[off] = 0;
    for(let x=0;x<size;x++){
      const i=off+1+4*x, px=x+.5, py=y+.5;
      const fill = [Math.round(90+19*(x/size)),Math.round(65+21*(y/size)),Math.round(200+28*(1-x/size)),255];
      const stroke = segment(px,py,sx(.31),sx(.69),sx(.31),sx(.31),sx(.072)) ||
        segment(px,py,sx(.31),sx(.31),sx(.69),sx(.69),sx(.072)) ||
        segment(px,py,sx(.69),sx(.31),sx(.69),sx(.69),sx(.072));
      const dot = (px-sx(.72))**2 + (py-sx(.29))**2 < (sx(.045))**2;
      const pixel = stroke ? [255,255,255,255] : dot ? [120,255,216,255] : fill;
      bytes[i]=pixel[0];bytes[i+1]=pixel[1];bytes[i+2]=pixel[2];bytes[i+3]=pixel[3];
    }
  }
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(bytes,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
for (const size of [192,512]) writeFileSync(resolve(folder,'nexus-'+size+'.png'), draw(size));
console.log('Generated Nexus 192px and 512px install icons.');

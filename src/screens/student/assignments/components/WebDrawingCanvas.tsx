import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export class DrawingErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ color: '#ef4444', fontSize: 13 }}>Drawing canvas failed to load. Please refresh the page.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export function WebDrawingCanvas({ onCapture, color }: { onCapture: (b64: string, mime: string) => void; color: string }) {
  const canvasRef = useRef<any>(null);
  const drawing   = useRef(false);
  const history   = useRef<any[]>([]);
  const [penColor, setPenColor] = useState('#1e293b');
  const [penSize,  setPenSize]  = useState(10);
  const [eraser,   setEraser]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  function getXY(e: any) {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    return { x: (clientX - r.left) * (c.width / r.width), y: (clientY - r.top) * (c.height / r.height) };
  }
  function ctx() {
    return canvasRef.current ? canvasRef.current.getContext('2d') : null;
  }
  function start(e: any) {
    const c = canvasRef.current;
    const cx = ctx();
    if (!c || !cx) return;
    const snap = cx.getImageData(0, 0, c.width, c.height);
    history.current.push(snap);
    if (history.current.length > 20) history.current.shift();
    const { x, y } = getXY(e);
    cx.beginPath(); cx.moveTo(x, y);
    drawing.current = true;
    setSaved(false);
  }
  function move(e: any) {
    if (!drawing.current) return;
    const cx = ctx();
    if (!cx) return;
    const { x, y } = getXY(e);
    if (eraser) {
      cx.globalCompositeOperation = 'destination-out';
      cx.strokeStyle = 'rgba(0,0,0,1)';
      cx.lineWidth = 36;
    } else {
      cx.globalCompositeOperation = 'source-over';
      cx.strokeStyle = penColor;
      cx.lineWidth = penSize;
    }
    cx.lineCap = 'round';
    cx.lineJoin = 'round';
    cx.lineTo(x, y);
    cx.stroke();
  }
  function stop() {
    if (!drawing.current) return;
    drawing.current = false;
    const dataUrl = canvasRef.current ? canvasRef.current.toDataURL('image/png') : null;
    if (dataUrl) { onCapture(dataUrl.split(',')[1], 'image/png'); setSaved(true); }
  }
  function undo() {
    if (!history.current.length) return;
    const snap = history.current.pop();
    const cx = ctx();
    if (cx && snap) cx.putImageData(snap, 0, 0);
    const dataUrl = canvasRef.current ? canvasRef.current.toDataURL('image/png') : null;
    if (dataUrl) onCapture(dataUrl.split(',')[1], 'image/png');
    setSaved(true);
  }
  function clear() {
    const c = canvasRef.current;
    const cx = ctx();
    if (!c || !cx) return;
    const snap = cx.getImageData(0, 0, c.width, c.height);
    history.current.push(snap);
    if (history.current.length > 20) history.current.shift();
    cx.clearRect(0, 0, c.width, c.height);
    setSaved(false);
  }

  const COLORS = ['#1e293b','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#ffffff'];

  return (
    <View style={{ marginBottom: 8 }}>
        {/* Color swatches */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
          {COLORS.map(c => (
            <TouchableOpacity key={c} onPress={() => { setPenColor(c); setEraser(false); }} activeOpacity={0.8}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c, margin: 3,
                borderWidth: (!eraser && penColor === c) ? 3 : 1,
                borderColor: (!eraser && penColor === c) ? '#BAA467' : '#d1d5db' }} />
          ))}
        </View>

        {/* Tools row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          {/* Pen sizes */}
          {([5, 10, 20] as number[]).map(sz => (
            <TouchableOpacity key={sz} onPress={() => { setPenSize(sz); setEraser(false); }} activeOpacity={0.8}
              style={{ width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 6,
                backgroundColor: (!eraser && penSize === sz) ? '#ede9fe' : '#f8fafc',
                borderWidth: 1, borderColor: (!eraser && penSize === sz) ? '#BAA467' : '#e2e8f0' }}>
              <View style={{ width: sz, height: sz, borderRadius: Math.round(sz / 2), backgroundColor: penColor }} />
            </TouchableOpacity>
          ))}

          <View style={{ width: 1, height: 28, backgroundColor: '#e2e8f0', marginHorizontal: 6 }} />

          {/* Eraser */}
          <TouchableOpacity onPress={() => setEraser(prev => !prev)} activeOpacity={0.8}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 6,
              backgroundColor: eraser ? '#fef3c7' : '#f8fafc',
              borderWidth: 1, borderColor: eraser ? '#d97706' : '#e2e8f0' }}>
            <Feather name="delete" size={16} color={eraser ? '#d97706' : '#64748b'} />
            <Text style={{ fontSize: 12, marginLeft: 4, fontWeight: '600', color: eraser ? '#d97706' : '#64748b' }}>Eraser</Text>
          </TouchableOpacity>

          {/* Undo */}
          <TouchableOpacity onPress={undo} activeOpacity={0.8}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 6,
              backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' }}>
            <Feather name="corner-left-up" size={16} color="#64748b" />
            <Text style={{ fontSize: 12, marginLeft: 4, fontWeight: '600', color: '#64748b' }}>Undo</Text>
          </TouchableOpacity>

          {/* Clear */}
          <TouchableOpacity onPress={clear} activeOpacity={0.8}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
              backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' }}>
            <Feather name="trash-2" size={16} color="#ef4444" />
            <Text style={{ fontSize: 12, marginLeft: 4, fontWeight: '600', color: '#ef4444' }}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          style={{ width: '100%', height: 300, borderRadius: 12, backgroundColor: '#fff',
            border: '2px dashed #c4b5fd', cursor: 'crosshair', touchAction: 'none', display: 'block' } as any}
          onMouseDown={start as any}
          onMouseMove={move as any}
          onMouseUp={stop as any}
          onMouseLeave={stop as any}
          onTouchStart={start as any}
          onTouchMove={move as any}
          onTouchEnd={stop as any}
        />
        {saved && <Text style={{ fontSize: 11, color: '#10b981', textAlign: 'center', marginTop: 4, fontWeight: '600' }}>Drawing saved</Text>}
    </View>
  );
}

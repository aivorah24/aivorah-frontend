/**
 * OnboardingScreen.tsx
 * Routes to the role-specific onboarding layout (Student/Teacher/Parent
 * "boxes" screens). Also the shared home for DatePickerInput and the
 * curriculum/grade/learning-style constants those screens import.
 *
 * This used to be a full multi-step wizard component in its own right, but
 * every real role (student/teacher/parent — the only roles that can reach
 * onboarding) returns early to its own dedicated screen before any of that
 * wizard code runs. The old wizard body was confirmed unreachable and
 * removed (2026-08-17) rather than left as dead code.
 */
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import OnboardingStudentBoxes from './OnboardingStudentBoxes';
import OnboardingTeacherBoxes from './OnboardingTeacherBoxes';
import OnboardingParentBoxes from '../parent/onboarding/OnboardingParentBoxes';

// ── Custom Date Picker ─────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// mode: 'day' | 'month' | 'year'
export function DatePickerInput({ value, onChange, colors }: {
  value: string;
  onChange: (v: string) => void;
  colors: any;
}) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top: 0, left: 0 });
  const [mode, setMode] = useState<'day'|'month'|'year'>('day');
  const [yearRangeStart, setYearRangeStart] = useState(0);
  const btnRef = useRef<any>(null);

  const today  = new Date();
  const parsed = value ? (() => {
    const [d, m, y] = value.split('/').map(Number);
    return new Date(y, m - 1, d);
  })() : null;

  const [viewYear,  setViewYear]  = useState(parsed?.getFullYear()  ?? today.getFullYear() - 15);
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth()      ?? today.getMonth());

  const bg = colors.bgDark, border = colors.borderColor, text = colors.textMain, muted = colors.textMuted;
  const displayValue = value || 'DD / MM / YYYY';
  const selectedDay  = parsed?.getMonth() === viewMonth && parsed?.getFullYear() === viewYear ? parsed.getDate() : null;

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const yearStart = yearRangeStart || Math.floor(viewYear/12)*12;
  const yearGrid  = Array.from({length:12}, (_,i) => yearStart+i);

  function openPicker() {
    if (btnRef.current && typeof (btnRef.current as any).getBoundingClientRect === 'function') {
      const rect = (btnRef.current as any).getBoundingClientRect();
      const calHeight = 360;
      const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
      // Anchor below the field; flip above if not enough room.
      const top = (rect.bottom + calHeight > winH && rect.top - calHeight > 0)
        ? rect.top - calHeight - 6
        : rect.bottom + 6;
      setPos({ top, left: rect.left });
    }
    setMode('day');
    setOpen(true);
  }

  const calendarContent = (
    <View style={{
      backgroundColor: bg, borderWidth: 1.5, borderColor: TEAL + '99',
      borderRadius: 14, padding: 16, width: 290,
      shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5, shadowRadius: 16,
    }}>
      {/* ── Day View ── */}
      {mode === 'day' && (
        <View>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <TouchableOpacity onPress={() => { if (viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); }}
              style={{ padding:6 }}><Text style={{ color:TEAL, fontSize:18 }}>‹</Text></TouchableOpacity>
            <View style={{ flexDirection:'row', gap:4 }}>
              <TouchableOpacity onPress={() => setMode('month')} style={{ padding:4 }}>
                <Text style={{ color:text, fontWeight:'700', fontSize:15, textDecorationLine:'underline' }}>{MONTHS[viewMonth]}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setYearRangeStart(Math.floor(viewYear/12)*12); setMode('year'); }} style={{ padding:4 }}>
                <Text style={{ color:text, fontWeight:'700', fontSize:15, textDecorationLine:'underline' }}>{viewYear}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => { if (viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); }}
              style={{ padding:6 }}><Text style={{ color:TEAL, fontSize:18 }}>›</Text></TouchableOpacity>
          </View>
          <View style={{ flexDirection:'row', marginBottom:6 }}>
            {DAYS.map(d => <Text key={d} style={{ flex:1, textAlign:'center', fontSize:11, fontWeight:'700', color:muted }}>{d}</Text>)}
          </View>
          {Array.from({length: cells.length/7}, (_,row) => (
            <View key={row} style={{ flexDirection:'row', marginBottom:2 }}>
              {cells.slice(row*7, row*7+7).map((day, ci) => {
                const isSel   = day !== null && day === selectedDay;
                const isToday = day !== null && viewYear===today.getFullYear() && viewMonth===today.getMonth() && day===today.getDate();
                return (
                  <TouchableOpacity key={ci} onPress={() => {
                    if (!day) return;
                    const dd = String(day).padStart(2,'0'), mm = String(viewMonth+1).padStart(2,'0');
                    onChange(`${dd}/${mm}/${viewYear}`); setOpen(false);
                  }} style={{ flex:1, height:34, borderRadius:8, alignItems:'center', justifyContent:'center',
                    backgroundColor: isSel ? TEAL : isToday ? TEAL+'33' : 'transparent' }}>
                    <Text style={{ fontSize:13, color: isSel?'#fff': day?text:'transparent', fontWeight: isSel||isToday?'700':'400' }}>{day??''}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          {value ? (
            <TouchableOpacity onPress={() => { onChange(''); setOpen(false); }} style={{ marginTop:10 }}>
              <Text style={{ textAlign:'center', color:'#ef4444', fontSize:12 }}>Clear date</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* ── Month View ── */}
      {mode === 'month' && (
        <View>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <TouchableOpacity onPress={() => setViewYear(y=>y-1)} style={{ padding:6 }}><Text style={{ color:TEAL, fontSize:18 }}>‹</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setYearRangeStart(Math.floor(viewYear/12)*12); setMode('year'); }} style={{ padding:4 }}>
              <Text style={{ color:text, fontWeight:'700', fontSize:15, textDecorationLine:'underline' }}>{viewYear}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewYear(y=>y+1)} style={{ padding:6 }}><Text style={{ color:TEAL, fontSize:18 }}>›</Text></TouchableOpacity>
          </View>
          {Array.from({length:3}, (_,row) => (
            <View key={row} style={{ flexDirection:'row', gap:4, marginBottom:4 }}>
              {Array.from({length:4}, (_,col) => { const mi=row*4+col; const isSel=mi===viewMonth; return (
                <TouchableOpacity key={mi} onPress={() => { setViewMonth(mi); setMode('day'); }}
                  style={{ flex:1, padding:10, borderRadius:8, alignItems:'center', backgroundColor: isSel?TEAL:'transparent' }}>
                  <Text style={{ color:isSel?'#fff':text, fontSize:13, fontWeight:isSel?'700':'400' }}>{MONTHS[mi].slice(0,3)}</Text>
                </TouchableOpacity>
              );})}
            </View>
          ))}
        </View>
      )}

      {/* ── Year View ── */}
      {mode === 'year' && (
        <View>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <TouchableOpacity onPress={() => setYearRangeStart(s=>(s||Math.floor(viewYear/12)*12)-12)} style={{ padding:6 }}><Text style={{ color:TEAL, fontSize:18 }}>‹</Text></TouchableOpacity>
            <Text style={{ color:text, fontWeight:'700', fontSize:14 }}>{yearStart} – {yearStart+11}</Text>
            <TouchableOpacity onPress={() => setYearRangeStart(s=>(s||Math.floor(viewYear/12)*12)+12)} style={{ padding:6 }}><Text style={{ color:TEAL, fontSize:18 }}>›</Text></TouchableOpacity>
          </View>
          {Array.from({length:3}, (_,row) => (
            <View key={row} style={{ flexDirection:'row', gap:4, marginBottom:4 }}>
              {yearGrid.slice(row*4, row*4+4).map(yr => { const isSel=yr===viewYear; return (
                <TouchableOpacity key={yr} onPress={() => { setViewYear(yr); setMode('month'); }}
                  style={{ flex:1, padding:10, borderRadius:8, alignItems:'center', backgroundColor: isSel?TEAL:'transparent' }}>
                  <Text style={{ color:isSel?'#fff':text, fontSize:13, fontWeight:isSel?'700':'400' }}>{yr}</Text>
                </TouchableOpacity>
              );})}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <>
      <TouchableOpacity ref={btnRef} onPress={openPicker} activeOpacity={0.8}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          height: 48, paddingHorizontal: 14, borderRadius: 10,
          borderWidth: 1, borderColor: open ? TEAL : border,
          backgroundColor: bg, minWidth: 220,
        }}>
        <Text style={{ fontSize: 15, color: value ? text : muted, marginRight: 12 }}>{displayValue}</Text>
        <Feather name="calendar" size={16} color={open ? TEAL : muted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'transparent' }}
          activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={{ position: 'absolute', top: pos.top, left: pos.left }}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              {calendarContent}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Constants ──────────────────────────────────────────────
export const CURRICULA = ['IB PYP', 'IB MYP', 'IB DP', 'CBSE', 'ICSE', 'Cambridge'];

export function getGradesForCurriculum(curr: string): string[] {
  if (curr === 'IB PYP') return ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5'];
  if (curr === 'IB MYP') return ['Grade 6','Grade 7','Grade 8','Grade 9','Grade 10'];
  if (curr === 'IB DP')  return ['Grade 11','Grade 12'];
  return ['Nursery','LKG','UKG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];
}

export const GRADES_TEACHER = ['Nursery','LKG','UKG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];
export const SUBJECTS = ['Mathematics','Science','English','Social Studies','Hindi','ICT','Art','Music','Physical Education'];
export const GENDERS = ['Male', 'Female', 'Prefer not to say'];
export const LEARNING_STYLES: { id: string; label: string; icon: string; desc: string }[] = [
  { id: 'visual', label: 'Visual', icon: 'eye', desc: 'I learn best with pictures and diagrams' },
  { id: 'reading', label: 'Reading', icon: 'book', desc: 'I learn best by reading and writing' },
  { id: 'hands-on', label: 'Hands-on', icon: 'tool', desc: 'I learn best by doing and experimenting' },
  { id: 'auditory', label: 'Auditory', icon: 'headphones', desc: 'I learn best by listening' },
];

export const TEAL = '#5F8A86';

// ── Screen router ──────────────────────────────────────────
// Students, teachers, and parents each get a role-specific "boxes" layout —
// all sections visible on one page. This screen just routes to the right
// one; the actual onboarding UI/logic lives in those files.
export default function OnboardingScreen() {
  const { user } = useAuth();
  const role: string = user?.role || 'student';

  if (role === 'teacher') return <OnboardingTeacherBoxes />;
  if (role === 'parent')  return <OnboardingParentBoxes />;
  return <OnboardingStudentBoxes />;
}

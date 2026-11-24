"use client";
import {useEffect,useState} from "react";
import styles from "./Celebration.module.css";

export default function Celebration({mode}:{mode:"sparkles"|"confetti"}) {
  const [show,setShow]=useState(true);
  useEffect(()=>{const t=setTimeout(()=>setShow(false),mode==="confetti"?3300:1350);return()=>clearTimeout(t)},[mode]);
  if(!show)return null;
  return <div className={mode==="confetti"?styles.screen:styles.burst} aria-hidden="true">{Array.from({length:mode==="confetti"?72:22},(_,i)=><i key={i} className={mode==="confetti"?styles.confetti:styles.spark} style={{"--x":`${i*47%100}%`,"--color":["#e7b840","#fdf0b8","#b3123b","#42b77e","#ffffff","#ad65d0"][i%6],"--delay":`${i%8*.08}s`,"--dx":`${Math.cos(i*Math.PI/11)*(35+i%6*15)}px`,"--dy":`${Math.sin(i*Math.PI/11)*(35+i%6*15)}px`,"--drift":`${(i%11-5)*22}px`} as React.CSSProperties}>{mode==="sparkles"?"✦":null}</i>)}</div>;
}

"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const XAU60Terminal = dynamic(() => import("@/components/gold/xau60-terminal"), {
  ssr: false,
  loading: () => (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0a0e14",color:"#22c55e",fontFamily:"Segoe UI,sans-serif",fontSize:14}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:28,fontWeight:800,marginBottom:8}}>XAU-60 MT5 Trading Bot Pro</div>
        <div style={{color:"#6b7280"}}>Loading Streamlit dashboard...</div>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <main>
      <XAU60Terminal />
    </main>
  );
}

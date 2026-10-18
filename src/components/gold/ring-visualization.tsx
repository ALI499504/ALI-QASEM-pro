"use client";

import { useEffect, useRef } from "react";

interface RingNode {
  id: string;
  name: string;
  nameAr: string;
  color: string;
  status: "idle" | "scanning" | "active" | "blocked" | "executed";
  confidence: number;
}

interface Props {
  nodes: RingNode[];
  centerLabel: string;
  centerValue: string;
  centerColor: string;
  isRunning?: boolean;
  activeAgentId?: string;
  height?: number;
}

/**
 * ATS Matrix 3D Particle Ring — torus made of particles
 * Each agent has 6 anchor positions on the torus.
 * Particles are colored per-agent, with depth (z) perspective.
 * Connects nearby particles with faint lines for "data flow".
 *
 * Inspired by: github.com/anyel1to/ATSMATRIX-AGENT-RING
 * Adapted as a 3D particle torus visualization.
 */

interface Particle {
  x: number;
  y: number;
  z: number;
  color: string;
  agentId: string;
  isAnchor: boolean; // anchor particles = the worker nodes (6 agents)
  glow: number; // 0..1
}

export default function RingVisualization({
  nodes,
  centerLabel,
  centerValue,
  centerColor,
  isRunning = false,
  activeAgentId,
  height = 480,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rotationRef = useRef({ x: 0.3, y: 0 });
  const stateRef = useRef({
    active: activeAgentId ?? "",
    lastFlip: 0,
  });

  // Build particles on a torus
  useEffect(() => {
    const particles: Particle[] = [];
    const majorRadius = 1.0; // torus major radius
    const minorRadius = 0.32; // torus minor radius (thickness)

    // 6 anchor nodes (one per agent) — placed around the torus
    nodes.forEach((node, i) => {
      const theta = (i / nodes.length) * Math.PI * 2; // angle around the torus center
      // For each anchor, place 1 big anchor particle + 20 surrounding particles
      // Anchor (the worker node)
      particles.push({
        x: (majorRadius + minorRadius * Math.cos(0)) * Math.cos(theta),
        y: (majorRadius + minorRadius * Math.cos(0)) * Math.sin(theta),
        z: minorRadius * Math.sin(0),
        color: node.color,
        agentId: node.id,
        isAnchor: true,
        glow: 1,
      });

      // Surrounding particles forming the ring band
      for (let j = 0; j < 24; j++) {
        const phi = (j / 24) * Math.PI * 2;
        const x = (majorRadius + minorRadius * Math.cos(phi)) * Math.cos(theta);
        const y = (majorRadius + minorRadius * Math.cos(phi)) * Math.sin(theta);
        const z = minorRadius * Math.sin(phi);
        particles.push({
          x,
          y,
          z,
          color: node.color,
          agentId: node.id,
          isAnchor: false,
          glow: 0.4 + Math.random() * 0.4,
        });
      }
    });

    // Add additional "free" particles that orbit on the torus for density
    for (let i = 0; i < 80; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 2;
      const r = minorRadius * (0.85 + Math.random() * 0.15);
      const agentIdx = Math.floor(Math.random() * nodes.length);
      const node = nodes[agentIdx];
      particles.push({
        x: (majorRadius + r * Math.cos(phi)) * Math.cos(theta),
        y: (majorRadius + r * Math.cos(phi)) * Math.sin(theta),
        z: r * Math.sin(phi),
        color: node.color,
        agentId: node.id,
        isAnchor: false,
        glow: 0.2 + Math.random() * 0.5,
      });
    }

    particlesRef.current = particles;
  }, [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;

    function draw() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width;
      const h = rect.height;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const scale = Math.min(w, h) * 0.32;

      ctx!.clearRect(0, 0, w, h);

      // Background: radial gradient halo
      const bgGrad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, scale * 2);
      bgGrad.addColorStop(0, `${centerColor}11`);
      bgGrad.addColorStop(1, "transparent");
      ctx!.fillStyle = bgGrad;
      ctx!.fillRect(0, 0, w, h);

      // Rotate
      if (isRunning) {
        rotationRef.current.y += 0.006;
        rotationRef.current.x = 0.32 + Math.sin(performance.now() / 4000) * 0.1;
      }
      const rotY = rotationRef.current.y;
      const rotX = rotationRef.current.x;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Project 3D → 2D with perspective
      const project = (x: number, y: number, z: number) => {
        // Rotate around Y
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        // Rotate around X
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        // Perspective
        const perspective = 1.5 / (1.5 + z2 * 0.5);
        return {
          px: cx + x1 * scale * perspective,
          py: cy + y2 * scale * perspective,
          pz: z2,
          scale: perspective,
        };
      };

      // Project all particles
      const projected = particlesRef.current.map((p) => {
        const proj = project(p.x, p.y, p.z);
        return { ...p, ...proj };
      });

      // Sort by z (back-to-front for proper layering)
      projected.sort((a, b) => a.pz - b.pz);

      // Draw connecting lines between adjacent particles on the same ring
      ctx!.lineWidth = 0.5;
      for (let i = 0; i < projected.length; i++) {
        const p1 = projected[i];
        if (p1.isAnchor) continue;
        // Find nearest neighbor
        for (let j = i + 1; j < projected.length; j++) {
          const p2 = projected[j];
          if (p2.agentId !== p1.agentId) continue;
          const dx = p1.px - p2.px;
          const dy = p1.py - p2.py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 18) {
            const alpha = (1 - dist / 18) * 0.15 * Math.min(p1.scale, p2.scale);
            ctx!.strokeStyle = `${p1.color}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
            ctx!.beginPath();
            ctx!.moveTo(p1.px, p1.py);
            ctx!.lineTo(p2.px, p2.py);
            ctx!.stroke();
          }
        }
      }

      // Draw particles (smaller in back, bigger in front)
      projected.forEach((p) => {
        const isActive = stateRef.current.active === p.agentId;
        const sizeMul = p.isAnchor ? 4 : 1.5;
        const size = sizeMul * p.scale * (p.isAnchor ? (isActive ? 1.5 : 1) : 1);
        const alpha = (p.isAnchor ? 1 : p.glow) * (0.5 + p.scale * 0.5);

        // Glow for active/anchor
        if (p.isAnchor || isActive) {
          ctx!.shadowColor = p.color;
          ctx!.shadowBlur = (isActive ? 20 : 12) * p.scale;
        } else {
          ctx!.shadowBlur = 0;
        }

        ctx!.fillStyle = `${p.color}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
        ctx!.beginPath();
        ctx!.arc(p.px, p.py, size, 0, Math.PI * 2);
        ctx!.fill();

        // Anchor has ring
        if (p.isAnchor) {
          ctx!.shadowBlur = 0;
          ctx!.strokeStyle = p.color;
          ctx!.lineWidth = 1.5;
          ctx!.beginPath();
          ctx!.arc(p.px, p.py, size + 2, 0, Math.PI * 2);
          ctx!.stroke();
        }
      });

      // Reset shadow
      ctx!.shadowBlur = 0;

      // Center: draw the consensus verdict
      const centerSize = 28;
      // Outer halo
      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, centerSize * 2.5);
      grad.addColorStop(0, `${centerColor}55`);
      grad.addColorStop(1, "transparent");
      ctx!.fillStyle = grad;
      ctx!.beginPath();
      ctx!.arc(cx, cy, centerSize * 2.5, 0, Math.PI * 2);
      ctx!.fill();

      // Inner circle
      ctx!.fillStyle = "#0b0e16";
      ctx!.strokeStyle = centerColor;
      ctx!.lineWidth = 2;
      ctx!.shadowColor = centerColor;
      ctx!.shadowBlur = 20;
      ctx!.beginPath();
      ctx!.arc(cx, cy, centerSize, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.stroke();
      ctx!.shadowBlur = 0;

      // Center text
      ctx!.fillStyle = centerColor;
      ctx!.font = "700 11px IBM Plex Mono, monospace";
      ctx!.textAlign = "center";
      ctx!.fillText(centerLabel, cx, cy - 3);
      ctx!.font = "800 18px IBM Plex Mono, monospace";
      ctx!.fillText(centerValue, cx, cy + 16);

      // Draw agent labels at their anchor positions (projected)
      projected.filter((p) => p.isAnchor).forEach((p) => {
        const node = nodes.find((n) => n.id === p.agentId);
        if (!node) return;
        ctx!.fillStyle = p.color;
        ctx!.font = "600 10px IBM Plex Mono, monospace";
        ctx!.textAlign = "center";
        // Position label outside the ring
        const dx = p.px - cx;
        const dy = p.py - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const labelX = p.px + (dx / dist) * 18;
        const labelY = p.py + (dy / dist) * 18;
        ctx!.fillText(node.name.split(" ")[0].toUpperCase(), labelX, labelY);
      });

      rafId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [nodes, centerColor, centerLabel, centerValue, isRunning]);

  // Update active agent
  useEffect(() => {
    stateRef.current.active = activeAgentId ?? "";
  }, [activeAgentId]);

  return (
    <div className="relative w-full" style={{ height }}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}

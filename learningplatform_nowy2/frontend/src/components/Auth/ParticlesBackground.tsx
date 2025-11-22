"use client";
import { useCallback, useEffect } from "react";
import Particles from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine } from "@tsparticles/engine";
import { tsParticles } from "@tsparticles/engine";

export default function ParticlesBackground() {
  useEffect(() => {
    loadSlim(tsParticles);
  }, []);

  return (
    <Particles
      id="tsparticles"
      options={{
        background: {
          color: {
            value: "transparent",
          },
        },
        fpsLimit: 60,
        interactivity: {
          events: {
            onHover: {
              enable: true,
              mode: "grab",
            },
            resize: {
              enable: true,
            } as any,
          },
          modes: {
            grab: {
              distance: 140,
              links: {
                opacity: 0.5,
              },
            },
          },
        },
        particles: {
          color: {
            value: ["#00ff88", "#ff00ff", "#00d4ff", "#ffaa00"],
          },
          links: {
            color: "#00d4ff",
            distance: 150,
            enable: true,
            opacity: 0.3,
            width: 1,
          },
          move: {
            direction: "none",
            enable: true,
            outModes: {
              default: "bounce",
            },
            random: true,
            speed: 1,
            straight: false,
          },
          number: {
            density: {
              enable: true,
            },
            value: 80,
          },
          opacity: {
            value: { min: 0.3, max: 0.7 },
          },
          shape: {
            type: ["circle", "square"],
          },
          size: {
            value: { min: 3, max: 8 },
          },
        },
        detectRetina: true,
      }}
      className="absolute inset-0 w-full h-full"
    />
  );
}


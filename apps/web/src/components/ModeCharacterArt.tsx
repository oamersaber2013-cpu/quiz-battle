// Mode Character SVG Art - Better Drawings
export const ModeCharacters = {
  classic: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="armor" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#7c6bff"/>
          <stop offset="100%" style="stop-color:#5a4fcf"/>
        </linearGradient>
        <linearGradient id="sword" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#d4b8ff"/>
          <stop offset="100%" style="stop-color:#a855f7"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <!-- Aura -->
      <ellipse cx="100" cy="160" rx="60" ry="15" fill="#6c63ff" opacity="0.3" filter="url(#glow)"/>
      <!-- Body -->
      <path d="M70,140 L70,80 L85,60 L115,60 L130,80 L130,140 Z" fill="url(#armor)"/>
      <!-- Cape -->
      <path d="M70,80 Q40,110 45,150 L70,140" fill="#4a3f8c"/>
      <path d="M130,80 Q160,110 155,150 L130,140" fill="#4a3f8c"/>
      <!-- Helmet -->
      <path d="M85,60 L85,40 L115,40 L115,60 L100,70 Z" fill="url(#armor)"/>
      <!-- Visor Glow -->
      <rect x="88" y="48" width="24" height="8" rx="2" fill="#d4b8ff" filter="url(#glow)">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite"/>
      </rect>
      <!-- Sword -->
      <rect x="94" y="25" width="12" height="70" rx="2" fill="url(#sword)" filter="url(#glow)"/>
      <rect x="90" y="90" width="20" height="8" rx="2" fill="#ffd700"/>
      <!-- Sword Glow Effect -->
      <ellipse cx="100" cy="30" rx="8" ry="15" fill="#d4b8ff" opacity="0.5" filter="url(#glow)">
        <animate attributeName="ry" values="15;20;15" dur="1.5s" repeatCount="indefinite"/>
      </ellipse>
    </svg>
  `,
  
  survival: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="hood" cx="50%" cy="50%">
          <stop offset="0%" style="stop-color:#3d3d3d"/>
          <stop offset="100%" style="stop-color:#1a1a1a"/>
        </radialGradient>
        <linearGradient id="scythe" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#ff6b6b"/>
          <stop offset="100%" style="stop-color:#ff4757"/>
        </linearGradient>
        <filter id="redGlow">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <!-- Smoke Aura -->
      <circle cx="100" cy="100" r="80" fill="#ff4757" opacity="0.1" filter="url(#redGlow)">
        <animate attributeName="r" values="80;85;80" dur="3s" repeatCount="indefinite"/>
      </circle>
      <!-- Cloak Body -->
      <path d="M60,100 Q60,40 100,35 Q140,40 140,100 L135,160 L65,160 Z" fill="url(#hood)"/>
      <!-- Hood -->
      <ellipse cx="100" cy="70" rx="35" ry="30" fill="#0d0d0d"/>
      <!-- Skull Face -->
      <ellipse cx="100" cy="75" rx="20" ry="18" fill="#2d2d2d"/>
      <!-- Glowing Red Eyes -->
      <circle cx="92" cy="72" r="6" fill="#ff4757" filter="url(#redGlow)">
        <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="108" cy="72" r="6" fill="#ff4757" filter="url(#redGlow)">
        <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" begin="1s"/>
      </circle>
      <!-- Scythe Handle -->
      <rect x="140" y="20" width="6" height="120" rx="3" fill="#4a4a4a"/>
      <!-- Scythe Blade -->
      <path d="M143,25 Q170,25 168,50 Q166,75 143,70" fill="url(#scythe)" filter="url(#redGlow)"/>
      <!-- Smoke Wisps -->
      <path d="M70,140 Q65,160 70,175" stroke="#ff4757" stroke-width="3" opacity="0.4" fill="none">
        <animate attributeName="d" values="M70,140 Q65,160 70,175;M70,140 Q75,160 70,175;M70,140 Q65,160 70,175" dur="4s" repeatCount="indefinite"/>
      </path>
      <path d="M130,140 Q135,160 130,175" stroke="#ff4757" stroke-width="3" opacity="0.4" fill="none">
        <animate attributeName="d" values="M130,140 Q135,160 130,175;M130,140 Q125,160 130,175;M130,140 Q135,160 130,175" dur="4s" repeatCount="indefinite" begin="2s"/>
      </path>
    </svg>
  `,
  
  conquest: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="uniform" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2ed573"/>
          <stop offset="100%" style="stop-color:#1e90ff"/>
        </linearGradient>
        <filter id="greenGlow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <!-- Holographic Map Base -->
      <ellipse cx="100" cy="165" rx="70" ry="20" fill="#2ed573" opacity="0.2" filter="url(#greenGlow)">
        <animate attributeName="opacity" values="0.2;0.4;0.2" dur="3s" repeatCount="indefinite"/>
      </ellipse>
      <!-- Body -->
      <path d="M72,75 L128,75 L124,145 L76,145 Z" fill="url(#uniform)"/>
      <!-- Cape -->
      <path d="M72,80 Q50,100 54,155 L76,145" fill="#1e6b3a"/>
      <path d="M128,80 Q150,100 146,155 L124,145" fill="#1e6b3a"/>
      <!-- Head -->
      <circle cx="100" cy="60" rx="22" fill="#f5d0c0"/>
      <!-- Eyes -->
      <circle cx="92" cy="58" r="3" fill="#2d3436"/>
      <circle cx="108" cy="58" r="3" fill="#2d3436"/>
      <!-- Confident Smile -->
      <path d="M94,68 Q100,72 106,68" stroke="#2d3436" stroke-width="2" fill="none"/>
      <!-- Pointing Hand -->
      <path d="M124,105 L162,88" stroke="url(#uniform)" stroke-width="12" stroke-linecap="round"/>
      <circle cx="168" cy="85" r="6" fill="#f5d0c0"/>
      <!-- Holographic Territories -->
      <circle cx="70" cy="155" r="5" fill="#ffd700">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="100" cy="162" r="5" fill="#ffd700">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" begin="0.5s"/>
      </circle>
      <circle cx="130" cy="155" r="5" fill="#ffd700">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" begin="1s"/>
      </circle>
      <!-- Connection Lines -->
      <line x1="70" y1="155" x2="100" y2="162" stroke="#7bed9f" stroke-width="2" opacity="0.6"/>
      <line x1="100" y1="162" x2="130" y2="155" stroke="#7bed9f" stroke-width="2" opacity="0.6"/>
      <!-- Rotating Ring -->
      <ellipse cx="100" cy="165" rx="55" ry="15" fill="none" stroke="#2ed573" stroke-width="2" stroke-dasharray="8,4" opacity="0.6" filter="url(#greenGlow)">
        <animateTransform attributeName="transform" type="rotate" from="0 100 165" to="360 100 165" dur="8s" repeatCount="indefinite"/>
      </ellipse>
    </svg>
  `,
  
  chaos: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="chaosBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ff00ff"/>
          <stop offset="50%" style="stop-color:#00ffff"/>
          <stop offset="100%" style="stop-color:#ff00ff"/>
        </linearGradient>
        <linearGradient id="chaosGlitch" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#ff00ff;stop-opacity:0"/>
          <stop offset="50%" style="stop-color:#ffffff;stop-opacity:0.3"/>
          <stop offset="100%" style="stop-color:#00ffff;stop-opacity:0"/>
        </linearGradient>
        <filter id="chaosGlow">
          <feGaussianBlur stdDeviation="8" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="heavyGlow">
          <feGaussianBlur stdDeviation="12" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Chaos Aura with Heavy Pulse -->
      <circle cx="100" cy="100" r="95" fill="url(#chaosBody)" opacity="0.1" filter="url(#heavyGlow)">
        <animate attributeName="r" values="95;110;95" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.1;0.3;0.1" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="100" cy="100" r="85" fill="url(#chaosBody)" opacity="0.2" filter="url(#chaosGlow)">
        <animate attributeName="r" values="85;95;85" dur="1s" repeatCount="indefinite"/>
      </circle>
      
      <!-- Glitch Overlay Rectangles -->
      <rect x="20" y="30" width="40" height="8" fill="#fff" opacity="0.1" filter="url(#chaosGlow)">
        <animate attributeName="x" values="20;120;60;20" dur="0.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0.2;0" dur="0.5s" repeatCount="indefinite"/>
      </rect>
      <rect x="140" y="80" width="30" height="6" fill="#ff00ff" opacity="0.15">
        <animate attributeName="x" values="140;40;100;140" dur="0.7s" repeatCount="indefinite"/>
      </rect>
      <rect x="60" y="150" width="50" height="4" fill="#00ffff" opacity="0.1">
        <animate attributeName="width" values="50;10;50" dur="0.3s" repeatCount="indefinite"/>
      </rect>
      
      <!-- Demon/Devil Character -->
      <!-- Body -->
      <ellipse cx="100" cy="120" rx="38" ry="52" fill="url(#chaosBody)" filter="url(#chaosGlow)">
        <animate attributeName="fill" values="url(#chaosBody);#ff00ff;#00ffff;#ff00ff;url(#chaosBody)" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="rx" values="38;40;38" dur="1s" repeatCount="indefinite"/>
      </ellipse>
      
      <!-- Body Cracks -->
      <path d="M70,100 L75,120 L72,140" stroke="#000" stroke-width="2" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite"/>
      </path>
      <path d="M130,110 L125,130 L128,150" stroke="#000" stroke-width="2" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.5;0.3" dur="2.5s" repeatCount="indefinite"/>
      </path>
      
      <!-- Head -->
      <circle cx="100" cy="65" r="32" fill="#2d1f3d"/>
      
      <!-- Extra Floating Eyes (Creepy) -->
      <circle cx="65" cy="45" r="4" fill="#ff00ff" opacity="0.6" filter="url(#chaosGlow)">
        <animate attributeName="opacity" values="0;0.8;0" dur="1.2s" repeatCount="indefinite"/>
        <animate attributeName="cy" values="45;40;45" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="135" cy="50" r="3" fill="#00ffff" opacity="0.6" filter="url(#chaosGlow)">
        <animate attributeName="opacity" values="0;0.8;0" dur="1s" repeatCount="indefinite" begin="0.3s"/>
      </circle>
      <circle cx="150" cy="70" r="2" fill="#ff00ff" opacity="0.5">
        <animate attributeName="opacity" values="0;1;0" dur="0.8s" repeatCount="indefinite" begin="0.6s"/>
      </circle>
      
      <!-- Horns (Glowing) -->
      <path d="M75,48 L60,15 L82,42" fill="#ff00ff" filter="url(#heavyGlow)">
        <animate attributeName="fill" values="#ff00ff;#ff66ff;#ff00ff" dur="0.5s" repeatCount="indefinite"/>
      </path>
      <path d="M125,48 L140,15 L118,42" fill="#00ffff" filter="url(#heavyGlow)">
        <animate attributeName="fill" values="#00ffff;#66ffff;#00ffff" dur="0.5s" repeatCount="indefinite" begin="0.25s"/>
      </path>
      
      <!-- Main Eyes (Glowing - Larger) -->
      <circle cx="88" cy="65" r="10" fill="#ff00ff" filter="url(#heavyGlow)">
        <animate attributeName="r" values="8;12;8" dur="0.4s" repeatCount="indefinite"/>
        <animate attributeName="fill" values="#ff00ff;#ff66ff;#ff00ff" dur="0.4s" repeatCount="indefinite"/>
      </circle>
      <circle cx="112" cy="65" r="10" fill="#00ffff" filter="url(#heavyGlow)">
        <animate attributeName="r" values="8;12;8" dur="0.4s" repeatCount="indefinite" begin="0.2s"/>
        <animate attributeName="fill" values="#00ffff;#66ffff;#00ffff" dur="0.4s" repeatCount="indefinite" begin="0.2s"/>
      </circle>
      
      <!-- Eye Pupils -->
      <circle cx="88" cy="65" r="4" fill="#000"/>
      <circle cx="112" cy="65" r="4" fill="#000"/>
      
      <!-- Mischievous Grin (Bigger) -->
      <path d="M82,82 Q100,100 118,82" stroke="#fff" stroke-width="4" fill="none">
        <animate attributeName="d" values="M82,82 Q100,100 118,82;M82,85 Q100,95 118,85;M82,82 Q100,100 118,82" dur="1s" repeatCount="indefinite"/>
      </path>
      
      <!-- Sharp Teeth -->
      <path d="M88,88 L92,95 L96,88" fill="#fff" opacity="0.9"/>
      <path d="M104,88 L108,95 L112,88" fill="#fff" opacity="0.9"/>
      
      <!-- Floating Chaos Symbols -->
      <!-- Dice -->
      <g transform="translate(145, 130)">
        <rect x="0" y="0" width="22" height="22" rx="4" fill="#fff" opacity="0.9">
          <animateTransform attributeName="transform" type="rotate" values="0 11 11;360 11 11" dur="4s" repeatCount="indefinite"/>
        </rect>
        <circle cx="11" cy="11" r="3" fill="#2d1f3d"/>
      </g>
      <g transform="translate(35, 135) rotate(15)">
        <rect x="0" y="0" width="20" height="20" rx="4" fill="#fff" opacity="0.8">
          <animateTransform attributeName="transform" type="rotate" values="15 10 10;375 10 10" dur="3s" repeatCount="indefinite"/>
        </rect>
        <circle cx="6" cy="6" r="2" fill="#2d1f3d"/>
        <circle cx="14" cy="14" r="2" fill="#2d1f3d"/>
      </g>
      
      <!-- Question Mark (Floating) -->
      <text x="160" y="60" font-size="24" fill="#ffd700" opacity="0.7" font-weight="bold">?</text>
      
      <!-- Lightning Bolts (More Intense) -->
      <path d="M45,45 L35,70 L45,70 L35,105" stroke="#ff00ff" stroke-width="4" fill="none" filter="url(#heavyGlow)">
        <animate attributeName="opacity" values="0;1;0.5;0" dur="0.25s" repeatCount="indefinite"/>
        <animate attributeName="stroke-width" values="4;6;4" dur="0.25s" repeatCount="indefinite"/>
      </path>
      <path d="M155,45 L165,70 L155,70 L165,105" stroke="#00ffff" stroke-width="4" fill="none" filter="url(#heavyGlow)">
        <animate attributeName="opacity" values="0;1;0.5;0" dur="0.25s" repeatCount="indefinite" begin="0.12s"/>
        <animate attributeName="stroke-width" values="4;6;4" dur="0.25s" repeatCount="indefinite" begin="0.12s"/>
      </path>
      <path d="M100,30 L95,50 L105,50 L100,70" stroke="#ff00ff" stroke-width="3" fill="none" filter="url(#chaosGlow)">
        <animate attributeName="opacity" values="0;0.8;0" dur="0.4s" repeatCount="indefinite" begin="0.2s"/>
      </path>
      
      <!-- Spiral/Vortex Element -->
      <path d="M100,170 Q130,170 130,150 Q130,130 100,130 Q70,130 70,150 Q70,170 100,170" 
            stroke="#ff00ff" stroke-width="2" fill="none" opacity="0.3" filter="url(#chaosGlow)">
        <animateTransform attributeName="transform" type="rotate" from="0 100 150" to="360 100 150" dur="3s" repeatCount="indefinite"/>
      </path>
    </svg>
  `
};

export default ModeCharacters;

const shapes = {
 p: '<circle cx="50" cy="24" r="12"/><path d="M40 36h20l-3 16 8 17H35l8-17Z"/><path d="M33 70h34l5 11H28Z"/>',
 r: '<path d="M27 16h12v11h8V16h10v11h8V16h12v22H27Z"/><path d="M35 39h30l-3 29H38Z"/><path d="M32 69h36l5 13H27Z"/>',
 n: '<path d="M28 80h45l-5-13c-1-9 5-17 2-29-2-8-8-15-18-19l-4-9-7 15-14 14-3 14 9 6 16-9c-14 12-16 18-21 30Z"/><path d="M31 80h42"/><circle cx="49" cy="35" r="2.7" fill="var(--eye)" stroke="none"/><path d="m60 30 5 15-5 15" fill="none"/>',
 b: '<path d="M50 13C25 32 30 46 43 51l-7 17h28l-7-17c13-5 18-19-7-38Z"/><path d="m49 21 10 13" fill="none"/><circle cx="50" cy="11" r="4"/><path d="M31 70h38l5 12H26Z"/>',
 q: '<circle cx="23" cy="24" r="4"/><circle cx="37" cy="17" r="4"/><circle cx="50" cy="13" r="4"/><circle cx="63" cy="17" r="4"/><circle cx="77" cy="24" r="4"/><path d="m24 30 9 27h34l9-27-16 12-10-22-10 22Z"/><path d="M35 58h30l-2 12H37Z"/><path d="M30 72h40l5 10H25Z"/>',
 k: '<path d="M50 9v19m-10-10h20" fill="none" stroke-width="5"/><path d="M50 36c-13-17-31-10-26 5l13 18h26l13-18c5-15-13-22-26-5Z"/><path d="M37 60h26l2 10H35Z"/><path d="M31 72h38l5 10H26Z"/>'
};
export function pieceSvg(piece) {
  const white = piece.color === 'w';
  return `<svg class="piece ${white ? 'white-piece' : 'black-piece'}" viewBox="0 0 100 100" aria-hidden="true" style="--eye:${white ? '#323b55' : '#e8edf7'}" fill="${white ? '#fbfcff' : '#29334b'}" stroke="${white ? '#414d68' : '#141b2d'}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round">${shapes[piece.type]}</svg>`;
}

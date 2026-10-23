/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        inkBlack: '#14101C',
        nightAbyss: '#1A1426',
        duskPlum: '#241B35',
        uiSurface: '#2C2140',
        periwinkle: '#4B3B6B',
        stoneBase: '#6E6680',
        stoneLight: '#9A91AD',
        creamShadow: '#DECBB1',
        creamBase: '#F6EFE2',
        creamLight: '#FFFDF9',
        maneViolet: '#6C2BD9',
        maneShadow: '#4C1D95',
        blushRose: '#E0467E',
        crimsonPop: '#F03A47',
        amberBase: '#F4A236',
        amberGlow: '#FFDF6D',
        grassShadow: '#1D3E2A',
        grassBase: '#2E6F40',
        grassLight: '#8CE071',
        waterDeep: '#1B3B5A',
        waterBase: '#2B6CB0',
        waterFoam: '#64E8D8',
        woodShadow: '#5C3A21',
        woodBase: '#8C5832',
        brickTerracotta: '#C84B31',
      },
    },
  },
  plugins: [],
}

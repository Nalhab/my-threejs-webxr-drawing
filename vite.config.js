import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import glsl from 'vite-plugin-glsl';
import dotenv from 'dotenv';

dotenv.config();

const serverHost = process.env.VITE_SERVER_HOST || '0.0.0.0';
const serverPort = process.env.VITE_SERVER_PORT || 3000;
const clientPort = process.env.VITE_CLIENT_PORT || 5173;

export default defineConfig({
    clearScreen: false,
    build: {
        sourcemap: true
    },
    server: {
        open: false,
        host: '0.0.0.0',
        port: clientPort,
        proxy: {
          '/api': {
            target: `http://${serverHost}:${serverPort}`,
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, '')
          }
        }
      },
    plugins: [
        viteStaticCopy({
          targets: [
              { src: 'node_modules/three/examples/jsm/libs/ammo.wasm.js', dest: 'jsm/libs/' },
              { src: 'node_modules/three/examples/jsm/libs/ammo.wasm.wasm', dest: 'jsm/libs/' },
              { src: 'node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.js', dest: 'jsm/libs/draco/gltf' },
              { src: 'node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm', dest: 'jsm/libs/draco/gltf/' },
              { src: 'node_modules/three/examples/jsm/libs/draco/gltf/draco_encoder.js', dest: 'jsm/libs/draco/gltf/' },
              { src: 'node_modules/three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js', dest: 'jsm/libs/draco/gltf/' }
          ]
        }),
        glsl()
    ]
});
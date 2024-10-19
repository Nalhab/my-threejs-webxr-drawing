import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
    clearScreen: false,
    build: {
        sourcemap: true
    },
    server: {
        open: false,
        host: '0.0.0.0',
        port: parseInt(process.env.VITE_CLIENT_PORT, 10) || 5173,
        proxy: {
            '/socket.io': {
                target: `http://${process.env.VITE_SERVER_HOST}:${process.env.VITE_SERVER_PORT}`,
                ws: true
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
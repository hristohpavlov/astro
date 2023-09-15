import { useTheme } from 'components/ThemeProvider';
import { Transition } from 'components/Transition';
import { useReducedMotion, useSpring } from 'framer-motion';
import { useInViewport, useWindowSize } from 'hooks';
import { startTransition, useEffect, useRef } from 'react';
import {
  AmbientLight,
  Color,
  DirectionalLight,
  Mesh,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  Vector2,
  WebGLRenderer,
  DoubleSide,
  TextureLoader,
  ShaderMaterial,
} from 'three';
import { rgbToThreeColor } from 'utils/style';
import { cleanRenderer, cleanScene, removeLights } from 'utils/three';
import styles from './DisplacementSphere.module.css';

import * as THREE from 'three';
const springConfig = {
  stiffness: 30,
  damping: 20,
  mass: 2,
};
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
export const DisplacementSphere = props => {
  const theme = useTheme();
  const { rgbBackground, themeId, colorWhite } = theme;
  const start = useRef(Date.now());
  const canvasRef = useRef();
  const mouse = useRef();
  const renderer = useRef();
  const camera = useRef();
  const scene = useRef();
  const lights = useRef();
  const uniforms = useRef();
  const material = useRef();
  const geometry = useRef();
  const sphere = useRef();
  const reduceMotion = useReducedMotion();
  const isInViewport = useInViewport(canvasRef);
  const windowSize = useWindowSize();
  const rotationX = useSpring(0, springConfig);
  const rotationY = useSpring(0, springConfig);

  useEffect(() => {
    const { innerWidth, innerHeight } = window;
    mouse.current = new Vector2(0, 0);
    renderer.current = new WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: true,
    });
    renderer.current.setSize(innerWidth, innerHeight);
    renderer.current.setPixelRatio(1);
    camera.current = new PerspectiveCamera(60, innerWidth / innerHeight, 1, 10);
    camera.current.position.set(5,0,0);
    scene.current = new Scene();
    
    const controls = new OrbitControls(camera.current, renderer.current.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 5;
    controls.update();

    var geom = new THREE.SphereGeometry(1.95, 500, 500);
    var colors = [];
    var color = new THREE.Color();
    var q = 0x189ad3;
    for (let i = 0; i < geom.attributes.position.count; i++) {
      color.set(q);
      color.toArray(colors, i * 3);
    }
    geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    
    const loader = new THREE.TextureLoader();
    const texture = loader.load("/static/earth_1.png");
    const loader1 = new THREE.TextureLoader();
    const texture1 = loader1.load("/static/bg3.webp");
    const background = new THREE.MeshBasicMaterial({map: texture1,side: THREE.BackSide,});
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    var disk = loader.load('/static/circle.png');
    var landmassInPoints = new THREE.Points(geom, new THREE.ShaderMaterial({
      vertexColors: true,
      uniforms: {
        visibility: {
          value: texture
        },
        shift: {
          value: 0
        },
        shape: {
          value: disk
        },
        size: {
          value: 0.00125
        },
        scale: {
          value: window.innerHeight * 5
        }
      },
      vertexShader: `          
          uniform float scale;
          uniform float size;
          
          varying vec2 vUv;
          varying vec3 vColor;
          
          void main() {
          
            vUv = uv;
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = size * ( scale / length( mvPosition.xyz ) );
            gl_Position = projectionMatrix * mvPosition;
    
          }
      `,
      fragmentShader: `
          uniform sampler2D visibility;
          uniform float shift;
          uniform sampler2D shape;
          
          varying vec2 vUv;
          varying vec3 vColor;
          
    
          void main() {
            
            vec2 uv = vUv;
            uv.x += shift;
            vec4 v = texture2D(visibility, uv);
            if (length(v.rgb) > 1.0) discard;
    
            gl_FragColor = vec4( vColor, 1.0 );
            vec4 shapeData = texture2D( shape, gl_PointCoord );
            if (shapeData.a < 0.5) discard;
            gl_FragColor = gl_FragColor * shapeData;
            
          }
      `,
      transparent: true
    }));
    const lineTexture = new TextureLoader().load("/static/merge_from_ofoct.jpg");
    const fillTexture = new TextureLoader().load("/static/earth_1.png");
    const mapTexture = new TextureLoader().load("/static/circle.png");
    const cloudTexture = new TextureLoader().load("/static/clouds.jpg");
    const suniforms = {
      lineTexture: { value: lineTexture },
      fillTexture: { value: fillTexture },
      mapTexture: { value: mapTexture },
    };
    const cloudUniforms = {
      cloudTexture: { value: cloudTexture },
    };
    material.current = new ShaderMaterial({
      uniforms: suniforms,
      side: DoubleSide,
      vertexShader: `
          precision highp float;
          varying vec2 vUv;
          varying vec3 vNormal;
          varying float _alpha;
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_Position = projectionMatrix * mvPosition;
          }
          `,
      fragmentShader: `
          uniform sampler2D lineTexture;
          uniform sampler2D fillTexture;
          uniform sampler2D mapTexture;
          varying vec2 vUv;
          varying vec3 vNormal;
          varying float _alpha;
          void main() {
            vec4 lineColor = texture2D( lineTexture, vUv );
            vec4 fillColor = texture2D( fillTexture, vUv );
            float silhouette = dot(vec3(0.0, 0.0, 1.0) ,vNormal );
            lineColor = vec4(lineColor.r,lineColor.g,lineColor.b,lineColor.a);
            float z = gl_FragCoord.z;
            if(lineColor.r <= 0.1) {
              discard;
            }
            gl_FragColor = vec4(lineColor.rgb * vec3(24.0 / 255.0,154.0 / 255.0,211.0 / 255.0), 1.0);
          }
          
      `,
      transparent: true,
    });
    const cloudShaderMaterial = new ShaderMaterial({
      uniforms: cloudUniforms,
      vertexShader: `
          precision highp float;
          varying vec2 vUv;
          varying vec3 vNormal;
    
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    
            gl_Position = projectionMatrix * mvPosition;
          }
          `,
      fragmentShader: `
          uniform sampler2D cloudTexture;
          varying vec2 vUv;
          varying vec3 vNormal;
    
          void main() {
            vec4 cloudColor = texture2D( cloudTexture, vUv );
            float silhouette = dot(vec3(0.0, 0.0, 1.0) ,vNormal );
            cloudColor = vec4(cloudColor.rgb,1.0);
            float c = 0.0;
            if(cloudColor.r <= 0.1) {
              discard;
            } else {
              cloudColor = vec4(c,c,c, 1.0);
                if(silhouette > 0.5 && silhouette < 0.8) {
                  c =1.0 -  pow((silhouette - 0.5) * 3.3, 2.1);
                } else {
                  c = 0.0;
                  discard;
                }
           }
            gl_FragColor = vec4(vec3(1.0,1.0,1.0) * c, c * 0.1);
          }
      `,
      transparent: true,
    });
    
    startTransition(() => {
      geometry.current = new SphereGeometry(1.95, 1000, 1000);
      sphere.current = new Mesh(geometry.current, material.current);
      sphere.current.rotation.y = Math.PI * -0.155;
      sphere.current.add(landmassInPoints);
      const backgroundGeom = new SphereGeometry(4.95, 100, 100);
      const backgorund = new Mesh(backgroundGeom, background);
      const cloudGeom = new SphereGeometry(2.35,100,100);
      const clouds = new Mesh(cloudGeom, cloudShaderMaterial);
      clouds.rotation.y = Math.PI * -0.155;
      // sphere.current.add(clouds);
      // sphere.current.add(backgorund);
      scene.current.add(sphere.current);
    });

    return () => {
      cleanScene(scene.current);
      cleanRenderer(renderer.current);
    };
  }, []);

  useEffect(() => {
    const dirLight = new DirectionalLight(colorWhite, 0.6);
    const ambientLight = new AmbientLight(colorWhite, themeId === 'light' ? 0.8 : 0.1);

    dirLight.position.z = 200;
    dirLight.position.x = 100;
    dirLight.position.y = 100;

    lights.current = [dirLight, ambientLight];
    scene.current.background = new Color(...rgbToThreeColor(rgbBackground));
    lights.current.forEach(light => scene.current.add(light));

    return () => {
      removeLights(lights.current);
    };
  }, [rgbBackground, colorWhite, themeId]);

  useEffect(() => {
    let animation;

    const animate = () => {
      animation = requestAnimationFrame(animate);

      if (uniforms.current !== undefined) {
        uniforms.current.time.value = 0.00005 * (Date.now() - start.current);
      }

      sphere.current.rotation.y -= 0.001;
      
      sphere.current.rotation.z = rotationX.get();
      sphere.current.rotation.x = rotationY.get();
      renderer.current.render(scene.current, camera.current);
    };

    if (!reduceMotion && isInViewport) {
      animate();
    } else {
      renderer.current.render(scene.current, camera.current);
    }

    return () => {
      cancelAnimationFrame(animation);
    };
  }, [isInViewport, reduceMotion, rotationX, rotationY]);

  return (
    <Transition in timeout={3000}>
      {visible => (
        <canvas
          aria-hidden
          className={styles.canvas}
          data-visible={visible}
          ref={canvasRef}
          {...props}
        />
      )}
    </Transition>
  );
};
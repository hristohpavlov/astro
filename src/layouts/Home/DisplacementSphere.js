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
    camera.current.position.set(4,0,0);
    scene.current = new Scene();
    const loader = new THREE.TextureLoader();
    const texture = loader.load("/static/earth.jpg");
    // material.current = new THREE.MeshBasicMaterial({map: texture});
    const atmosphereShader = {
      uniforms: {},
      vertexShader: [
        "varying vec3 vNormal;",
        "void main() {",
        "vNormal = normalize( normalMatrix * normal );",
        "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
        "}"
      ].join("\n"),
      fragmentShader: [
        "varying vec3 vNormal;",
        "void main() {",
        "float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );",
        "gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;",
        "}"
      ].join("\n")
    };
    

    const uniforms = THREE.UniformsUtils.clone(atmosphereShader.uniforms);
    const atmosphereGeometry = new THREE.SphereGeometry(1, 64, 32);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: atmosphereShader.vertexShader,
      fragmentShader: atmosphereShader.fragmentShader,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    const atmosphereMesh = new THREE.Mesh(
      atmosphereGeometry,
      atmosphereMaterial
    );
    atmosphereMesh.scale.set(1.8, 1.8, 1.8);
    const controls = new OrbitControls(camera.current, renderer.current.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 5;
    controls.update();

    var geom = new THREE.SphereGeometry(1.95, 640, 320);
    var colors = [];
    var color = new THREE.Color();
    var q = 0xffffff * 0.25;
    for (let i = 0; i < geom.attributes.position.count; i++) {
      color.set(q + q * 3);
      color.toArray(colors, i * 3);
    }
    geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    
    loader.setCrossOrigin('');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    var disk = loader.load('/static/circle.png');
    var points = new THREE.Points(geom, new THREE.ShaderMaterial({
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
    startTransition(() => {
      geometry.current = new SphereGeometry(0, 64, 32);
      sphere.current = new Mesh(geometry.current, material.current);
      // sphere.current.modifier = Math.random();
      sphere.current.rotation.y = Math.PI * -0.155;
      // sphere.current.add(atmosphereMesh);
      sphere.current.add(points);
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

      sphere.current.rotation.y += 0.001;
      
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
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
  Float32BufferAttribute,
  Vector3,
  BufferGeometry,
  PointsMaterial,
  Points,
  MathUtils,
  Group,
  TorusGeometry,
} from 'three';
import { rgbToThreeColor } from 'utils/style';
import { cleanRenderer, cleanScene, removeLights } from 'utils/three';
import styles from './DisplacementSphere.module.css';
import TWEEN from "@tweenjs/tween.js";

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
  const lines = useRef();
  const backgroundSp = useRef();
  const clouds = useRef();
  const points = useRef();
  const torus = useRef();
  const torus2 = useRef();
  const torus3 = useRef();
  const torus4 = useRef();
  const earthSil = useRef();
  const controls = useRef();
  const SatelliteLineShaderMaterial = new ShaderMaterial({
    side: DoubleSide,
    vertexShader: `
        precision highp float;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
          gl_Position = projectionMatrix * mvPosition;
        }
        `,
    fragmentShader: `

    void main() {
      float length = 1.0 - (gl_FragCoord.z / gl_FragCoord.w) / 40.0;
      if(length > 1.0) {
        length = 1.0;
      }else if(length < 0.3) {
        length = 0.3;
      }
      gl_FragColor = vec4(vec3(24.0 / 255.0,154.0 / 255.0,211.0 / 255.0) * length, length);
    }
  `,
    transparent: true,
  });
  const initSatelliteLine = () => {
    const geometry = new TorusGeometry(2.5, 0.002, 128, 128);
    torus.current = new Mesh(geometry, SatelliteLineShaderMaterial);
  
    const scale2 = 1;
    torus2.current = torus.current.clone();
    torus2.current.rotateX((Math.PI * 8) / 3);
    torus2.current.scale.set(scale2, scale2, scale2);

    const scale3 = 0.88;
    torus3.current = torus.current.clone();
    torus3.current.rotateX((Math.PI * 2) / 9);
    torus3.current.scale.set(scale3, scale3, scale3);
  
    const scale4 = 0.88;
    torus4.current = torus3.current.clone();
    torus4.current.rotateX((Math.PI * 2) / 9);
    torus4.current.scale.set(scale4, scale4, scale4);

    const g = new Group();
    g.add(torus.current);
    g.add(torus2.current);
    g.add(torus3.current);
    g.add(torus4.current);

    const tween= new TWEEN.Tween({ x: 1 })
      .to(
        {
          x: 2,
        },
        40000
      )
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(() => {
        torus.current.rotation.y += 6;
        torus2.current.rotation.y += 2;
        torus3.current.rotation.y += 4;
      })
      .repeat(Infinity);
    tween.start();
  
    return g;
  };
  const initPointsSys = () => {
    const vertices = [];
  
    for (let i = 0; i < 1000; i++) {
      const v = new Vector3(
        MathUtils.randFloatSpread(1),
        MathUtils.randFloatSpread(1),
        MathUtils.randFloatSpread(1)
      );
      v.normalize().multiplyScalar(Math.random() + 2.3);
      const x = v.x;
      const y = v.y;
      const z = v.z;
  
      vertices.push(x, y, z);
    }
  
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  
    const material = new PointsMaterial({
      color: 0x189ad3,
      size: 0.011,
      transparent: true,
    });
  
    points.current = new Points(geometry, material);
  
    const tween = new TWEEN.Tween({ x: 1 })
      .to(
        {
          x: 2,
        },
        40000
      )
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(() => {
        points.rotation.z += 50;
      })
      .repeat(Infinity);
    tween.start();
    sphere.current.add(points.current);
  };
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
    camera.current = new PerspectiveCamera(60, innerWidth / innerHeight, 1, 1000);
    camera.current.position.set(4,0,0);
    scene.current = new Scene();
    
    controls.current = new OrbitControls(camera.current, renderer.current.domElement);
    controls.current.enableDamping = true;
    controls.current.dampingFactor = 0.3;
    controls.current.enablePan = false;
    controls.current.minDistance = 3.51;
    if(innerWidth > 1000){controls.current.maxDistance = 4.5;}else {controls.current.maxDistance = 7;}
    
    controls.current.rotateSpeed = 0.35;
    controls.current.update();
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
    const texture = new TextureLoader().load("/static/earth_1.png");
    const texture1 = new TextureLoader().load("/static/bg.jpg");
    
    texture1.wrapS = THREE.RepeatWrapping;
    texture1.wrapT = THREE.RepeatWrapping;
    texture1.repeat.set(1, 1);
    const background = new THREE.MeshBasicMaterial({map: texture1,side: THREE.BackSide});
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
    const earthUniforms = {
      cloudTexture: { value: fillTexture },
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
    const earthShaderMaterial = new ShaderMaterial({
      uniforms: earthUniforms,
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
            gl_FragColor = vec4(vec3(24.0 / 255.0,154.0 / 255.0,211.0 / 255.0) * c, c * 0.1);
          }
      `,
      transparent: true,
    });
     
    startTransition(() => {
      const g = new Group();
      geometry.current = new SphereGeometry(1.95, 1000, 1000);
      sphere.current = new Mesh(geometry.current, material.current);
      sphere.current.rotation.y = Math.PI * -1.965;
      sphere.current.add(landmassInPoints);
      initPointsSys();
      lines.current = initSatelliteLine();
      
      g.add(lines.current);
      
      const backgroundGeom = new SphereGeometry(535.5, 100, 100);
      backgroundSp.current = new Mesh(backgroundGeom, background);
      g.add(backgroundSp.current);
      const cloudGeom = new SphereGeometry(2.17,100,100);
      clouds.current = new Mesh(cloudGeom, cloudShaderMaterial);
      clouds.current.rotation.y = Math.PI * -0.195;
      g.add(clouds.current);
      const earthGeom = new SphereGeometry(1.92,100,100);
      earthSil.current = new Mesh(earthGeom, earthShaderMaterial);
      g.add(earthSil.current);
      sphere.current.add(g);
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
      if(controls.current.target.distanceTo( controls.current.object.position ) > 3.7){
        points.current.rotation.y += 0.00095;
        torus.current.rotation.y += 0.00179;
        torus2.current.rotation.x += 0.00101;
        torus3.current.rotation.y += 0.00304;
        torus4.current.rotation.x += 0.00299;
        sphere.current.rotation.y -= 0.00066;
      }
      
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


  useEffect(() => {
    const { width, height } = windowSize;

    renderer.current.setSize(width, height);
    camera.current.aspect = width / height;
    camera.current.updateProjectionMatrix();

    // Render a single frame on resize when not animating
    if (reduceMotion) {
      renderer.current.render(scene.current, camera.current);
    }
    
  }, [reduceMotion, windowSize]);


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
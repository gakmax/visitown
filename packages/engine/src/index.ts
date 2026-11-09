// Visitown 엔진(로드맵 52): 타입, 팔레트·스프라이트, 지도·에셋, 스토어·시뮬레이터, 월드·렌더러. React·DOM을 모른다(캔버스는 생성자로 받고, 겉 화면 정보는 setShellInfo로 받는다).
// build.sh가 esbuild로 IIFE(전역 ENGINE)로 묶어 index.html에 넣고, 테스트는 CJS 번들을 읽는다. 테마는 import만 해도 THEMES에 자신을 등록한다
export * from './types';
export * from './palette';
export * from './map';
export * from './store';
export * from './world';
import './themes/candy';
import './themes/cyber';
import './themes/farm';
import './themes/forest';
import './themes/hanok';
import './themes/space';
import './themes/west';

### [2023.09.08]
  * 시작 및 배포 테스트 진행
  * 내부망으로 인한 commit 불가로, 직접 파일만 업로드(추후수정)

---
 ###### 초기화
 
    npm init

 ###### electron 의존성 설정
 
    npm i --save-dev electron

 ###### 실행

    npm start

 ###### 배포 모듈 설치

     npm i --save-dev electron-builder

 ###### 배포 진행
 
    npm run deploy:osx   # macOS
    npm run deploy:win   # Windows 32bit & 64bit
    npm run deploy:win32 # Windows 32bit
    npm run deploy:win64 # Windows 64bit

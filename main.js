/*
    배포 과정
    1. 배포 도구 설치
        > npm i --save-dev electron-builder
    2. pakage.json 편집
        > 파일명, 경로 등의 옵션 편집
    3. 빌드하기
        > npm run deploy:osx   # macOS
        > npm run deploy:win   # Windows 32bit & 64bit
        > npm run deploy:win32 # Windows 32bit
        > npm run deploy:win64 # Windows 64bit
    4. dist 폴더에서 exe 파일 확인 가능

    출처 : https://jetalog.net/104?category=741674
*/ 

const {app, BrowserWindow, ipcMain, webContents} = require('electron');
const path = require('path');

const createWindow = () => { // 윈도우 창 정의
    const options = {
        // https://www.electronjs.org/docs/latest/api/browser-window 에서 옵션 확인 가능
        width: 320,
        height: 240,
        // 페이지가 표시되기 전에 실행할 전처리 코드 지정(스크립트는 반드시 절대경로로 전달되어야 함)
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false,
        },
        resizable: false
    };

    // 동일한 옵션으로 2개의 창 생성
    const first = new BrowserWindow(options);
    const second = new BrowserWindow(options);
    
    first.loadFile('index.html');
    second.loadFile('index.html');

    // options.loadFile('index.html'); // 창에서 불러들일 HTML 문서르 지정
};

app.whenReady().then(()=>{ // Application이 준비된 후 실행할 스크립트 지정

    createWindow();

    let apples = 10;

    ipcMain.on('reqCount',(e) => {
        e.reply('count',apples);
    });

    ipcMain.on('reqSteal',(e) => {
        apples--;
        e.reply('count',apples);
    });

    ipcMain.on('reqBroadcast',(e) => {
        const contents = webContents.getAllWebContents();
        for (const c of contents) c.send('count',apples);
    });


    app.on('activate', ()=>{
        if(BrowserWindow.getAllWindows().length === 0) createWindow()
    });
});

app.on('window-all-closed',()=>{
    if(process.platform !== 'darwin') app.quit();
})
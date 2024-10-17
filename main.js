const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const oracledb = require('oracledb');
const stream = require('stream');
const { exec } = require('child_process');


async function backupAllPackages() {
  console.log('Starting backupAllPackages');
  let connection;

  

  try {
    connection = await oracledb.getConnection({
      user: '',
      password: '',
      connectString: '' // 예: 'localhost:1521/orcl'
    });

    console.time();
    console.log('Connected to Oracle DB');

    const packageList = await connection.execute(
      // `SELECT OBJECT_NAME FROM ALL_OBJECTS WHERE OBJECT_TYPE = 'PACKAGE' AND OWNER = '스키마명' AND OBJECT_NAME IN ('패키지명1', '패키지명2'...)`
      `SELECT OWNER, PACKAGE_NAME FROM XXX_SVN_COMMIT_PACKAGE`
    );

    console.log(packageList);

    // const backupDir = path.join(__dirname, 'backups');
    // 백업 경로 설정
    const backupDir = path.join('C:\\문서공유\\90. 공유폴더\\변승진','backups');
    console.log(backupDir);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    // for (const pkg of packageList.rows) {
    //   const packageName = pkg[0];
    //   console.log(`Backing up package: ${packageName}`);
    //   await backupPackageBody(connection, packageName, backupDir);
    // }

    // 병렬 처리를 위해 Promise.all 사용
    await Promise.all(packageList.rows.map(async (pkg) => {
      const owner = pkg[0];
      const packageName = pkg[1];
      console.log(`Backing up package: ${packageName}`);
      await backupPackageBody(connection, packageName, owner, backupDir);
    }));


    // SVN 업데이트 후 커밋
    await svnUpdateAndCommit('C:\\문서공유\\90. 공유폴더\\변승진', 'svnID', 'svnPWD');
    console.timeEnd();

    return backupDir;
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    if (connection) try{ 
        await connection.close();
        console.log('Connection closed');
      } catch (err) {
        console.error(err);
      }
    }
  }
  
 

async function backupPackageBody(connection, packageName, owner, backupDir) {
  try {
    const result = await connection.execute(
      `SELECT DBMS_METADATA.GET_DDL('PACKAGE_BODY', :packageName, :owner) AS DDL FROM DUAL`,
      [packageName,owner]
      // ,
      // { fetchAsString: [oracledb.CLOB] }
    );
    
    const clob = result.rows[0][0];
    const packageBodyText = await clob.getData();

    // const packageBodyText = result.rows[0].DDL;
    console.log('CLOB data fetched for', packageName);
    const filePath = path.join(backupDir, `${owner}_${packageName}.sql`);


    // 기존 파일이 있는지 확인
    if (fs.existsSync(filePath)) {
      // 기존 파일의 내용 읽기
      // const existingContent = fs.readFileSync(filePath, 'utf8');
      const existingContent = await readStreamData(filePath);

      // 기존 파일과 새로운 백업 데이터 비교
      if (existingContent !== packageBodyText) {
        // 파일이 변경되었을 경우에만 새로 백업 파일 생성
        // fs.writeFileSync(filePath, packageBodyText, 'utf8');
        await writeStreamData(filePath, packageBodyText);
        console.log(`Updated backup for ${packageName}`);
      } else {
        console.log(`No changes detected for ${packageName}, skipping backup`);
      }
    } else {
      // 파일이 없는 경우 새로 백업 파일 생성
      // fs.writeFileSync(filePath, packageBodyText, 'utf8');
      await writeStreamData(filePath, packageBodyText);

      console.log(`Backup saved for ${packageName}`);
    }

  } catch (err) {
    console.error(`Failed to backup package ${packageName}`, err);
  }
}

function writeStreamData(filePath, data) {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filePath);
    const clobStream = new stream.PassThrough();
    clobStream.end(Buffer.from(data, 'utf8'));
    clobStream.pipe(writeStream);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

function readStreamData(filePath) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(filePath, 'utf8');
    let data = '';

    readStream.on('data', (chunk) => {
      data += chunk;
    });

    readStream.on('end', () => {
      resolve(data);
    });

    readStream.on('error', (err) => {
      reject(err);
    });
  });
}

function svnAdd(filePath,repoPath) {
  return new Promise((resolve, reject) => {

    exec(`svn info \"${filePath}\"`,{cwd: repoPath}, (infoError, infoStdout, infoStderr) => {
      if(infoError){
        exec(`svn add \"${filePath}\"`,{cwd: repoPath}, (err, stdout, stderr) => {
          if (err) {
            console.error(`SVN add failed: ${stderr}`);
            reject(err);
            return;
          }
          console.log(`SVN add successful: ${stdout}`);
          resolve();
        });
      }else{
        console.log(`Folder already exists in SVN : \"${filePath}\"`);
        resolve();
      }
    })
    
  });
}


function svnUpdateAndCommit(repoPath, username, password) {
  return new Promise((resolve, reject) => {
    // SVN 업데이트
    exec(`svn update ${repoPath} --username ${username} --password ${password}`,{cwd: repoPath}, (error, stdout, stderr) => {
      if (error) {
        console.error(`SVN update failed: ${error.message}`);
        reject(error);
        return;
      }
      console.log(`SVN update successful: ${stdout}`);


      // 새로운 파일을 SVN에 추가
      svnAdd('C:\\문서공유\\90. 공유폴더\\변승진\\backups',repoPath); 
      
      // SVN 커밋
      const commitDate = getDate();

      exec(`svn commit -m "${commitDate} [변승진] 수익성/경영지표 패키지 백업"`,{cwd: repoPath}, (error, stdout, stderr) => { 
      if (error) {
          console.error(`SVN commit failed: ${error.message}`);
          reject(error);
          return;
        }
        console.log(`SVN commit successful: ${stdout}`);
        resolve();
      });
    });
  });
}

function getDate(){
  const today = new Date();

  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2,'0');
  const day = today.getDate().toString().padStart(2,'0');

  const dateString = year + '-' + month + '-' + day ;

  return dateString;
}



function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  win.loadFile('index.html');
  // win.webContents.openDevTools();  // 브라우저 창의 개발자 도구를 자동으로 엽니다.
}

app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('backup-packages', async (event) => {
  console.log('Received backup-packages event');
  try {
    const backupDir = await backupAllPackages();
    event.reply('backup-result', `Backup successful: files saved to ${backupDir}`);
  } catch (err) {
    event.reply('backup-result', `Backup failed: ${err.message}`);
  }
});

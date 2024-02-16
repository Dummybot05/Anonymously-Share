const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const path = require("path");
const multer = require("multer");
const cors = require("cors");
const upload = multer({ dest: "public/upload/" });
const fsprom = require("fs").promises;
const fs = require("fs");
const ejs = require("ejs");
const cron = require('node-cron');

app.use(express.static(path.join(__dirname, 'public') , { immutable: true, maxAge: '1d' }));

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(cors());

let globalJsonData;

readAndParseFile();
async function readAndParseFile() {
  try {
    const filePath = path.join(__dirname, 'public', 'uploadInfo.json');
    const data = await fsprom.readFile(filePath, 'utf-8');
    globalJsonData = JSON.parse(data);
  } catch (error) {
    console.error('Error reading or parsing the file:', error.message);
  }
}

/*
cron.schedule('* * * * *', () => {
  const currentDate = Date.now();

  globalJsonData.forEach(fileData => {
    if (fileData.expiryDate <= currentDate) {
      const filePath = path.join(__dirname, fileData.other.path);

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
        } else {
          console.log('File deleted:', filePath);
        }
      });

      const index = globalJsonData.findIndex(item => item.other.filename === fileData.other.filename);
      if (index !== -1) {
        globalJsonData.splice(index, 1);
        console.log('JSON data removed:', fileData.other.filename);
      }

      let jsonFilePath = path.join(__dirname, 'public', 'uploadInfo.json');
      fs.readFile(jsonFilePath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading file.json:', err);
        } else {
          const fileJson = JSON.parse(data);
          const jsonIndex = fileJson.findIndex(item => item.other.filename === fileData.other.filename);
          if (jsonIndex !== -1) {
            fileJson.splice(jsonIndex, 1);

            fs.writeFile(jsonFilePath, JSON.stringify(fileJson, null, 2), 'utf8', (err) => {
              if (err) {
                console.error('Error writing to file.json:', err);
              } else {
                console.log('JSON data removed from file.json:', fileData.other.filename);
              }
            });
          }
        }
      });
    }
  });
});
*/

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.get('/', (req, res) => {
  res.render(path.join(__dirname, 'views', 'index.ejs'));
});

app.get('/uploads', (req, res) => {
  res.render(path.join(__dirname, 'views', 'upload.ejs'));
});

app.get('/show', (req, res) => {
    const data = fs.readFileSync(path.join(__dirname, 'public', 'uploadInfo.json'), 'utf8');
    uploadData = JSON.parse(data);
    res.render(
       path.join(__dirname, 'views', 'all.ejs'),
       { data : uploadData }
    );
});

app.post("/upload", upload.single("myfile"), (req, res) => {
  const uploadDate = new Date();
  const expiryDate = new Date(uploadDate);
  expiryDate.setDate(uploadDate.getDate() + 1);
  saveUploadInfo(uploadDate.getTime(), expiryDate.getTime(), req.file);
  res.render(path.join(__dirname, 'views', 'back.ejs'));
});

function saveUploadInfo(uploadDate, expiryDate, fileName) {
  let uploadData = [];
  try {
    const data = fs.readFileSync(path.join(__dirname, 'public', 'uploadInfo.json'), 'utf8');
    uploadData = JSON.parse(data);
  } catch (err) { console.log("One Time Error For File Creation"); }
  uploadData.push({ uploadDate: uploadDate, expiryDate: expiryDate, other: fileName });
  fs.writeFileSync(path.join(__dirname, 'public', 'uploadInfo.json'), JSON.stringify(uploadData, null, 2));
}

app.get("/:filename", (req, res) => {
    const data = fs.readFileSync(path.join(__dirname, 'public', 'uploadInfo.json'), 'utf8');
    uploadData = JSON.parse(data);
    uploadData.map((item) => {
    if (item.other.filename == req.params.filename) {
      let ori = path.extname(item.other.originalname);
      res.render("show.ejs", { item: item, ori: ori });
    }
  });
});

app.get('/:filename/download', (req, res) => {
  const requestedFilename = req.params.filename;
    const data = fs.readFileSync(path.join(__dirname, 'public', 'uploadInfo.json'), 'utf8');
    uploadData = JSON.parse(data);
  const fileData = uploadData.find(file => file.other.filename === requestedFilename);

  if (fileData) {
    const originalFilename = fileData.other.originalname;
    try {
  res.download(
    path.join(__dirname, 'public', 'upload', requestedFilename),
    originalFilename,
    (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).send('Internal Server Error');
        }
      }
    }
  );
} catch (err) {
  console.error('Error during file download:', err);
  if (!res.headersSent) {
    res.status(500).send('Internal Server Error');
  }
}
  } else {
    res.status(404).send('File not found');
  }
});

cron.schedule('*/5 * * * * *', () => {
  const currentDate = Date.now();

  globalJsonData.forEach(fileData => {
    if (fileData.expiryDate <= currentDate) {
      const filePath = path.join(__dirname, fileData.other.path);

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting file:', err);
        } else {
          console.log('File deleted:', filePath);
        }
      });

      const index = globalJsonData.findIndex(item => item.other.filename === fileData.other.filename);
      if (index !== -1) {
        globalJsonData.splice(index, 1);
        console.log('JSON data removed:', fileData.other.filename);
      }

      let jsonFilePath = path.join(__dirname, 'public', 'uploadInfo.json');
      fs.readFile(jsonFilePath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading file.json:', err);
        } else {
          const fileJson = JSON.parse(data);
          const jsonIndex = fileJson.findIndex(item => item.other.filename === fileData.other.filename);
          if (jsonIndex !== -1) {
            fileJson.splice(jsonIndex, 1);

            fs.writeFile(jsonFilePath, JSON.stringify(fileJson, null, 2), 'utf8', (err) => {
              if (err) {
                console.error('Error writing to file.json:', err);
              } else {
                console.log('JSON data removed from file.json:', fileData.other.filename);
              }
            });
          }
        }
      });
    }
  });
});

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});


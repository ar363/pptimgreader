import Tesseract from "tesseract.js";
import fs from "fs";
import yauzl from "yauzl";

/**
 *
 * @param {string} file
 */
async function pptocr(file) {
  let pages = [];
  const w = await Tesseract.createWorker(["eng"]);
  await w.setParameters({
    tessedit_pageseg_mode: 6,
  })
  yauzl.open(file, { lazyEntries: true }, function (err, zipfile) {
    if (err) throw err;
    zipfile.readEntry();
    zipfile.on("entry", function (entry) {
      if (
        entry.fileName.endsWith("media/") ||
        entry.fileName.endsWith("ppt/")
      ) {
        zipfile.readEntry();
      } else {
        if (
          entry.fileName.startsWith("ppt/media/") &&
          (entry.fileName.endsWith("png") ||
            entry.fileName.endsWith("jpg") ||
            entry.fileName.endsWith("jpeg"))
        ) {
          zipfile.openReadStream(entry, async function (err, readStream) {
            if (err) throw err;
            const chunks = [];

            readStream.on("end", async function () {
              const buf = Buffer.concat(chunks);

              const x = await w.recognize(buf);

              pages.push({
                p: Number.parseInt(
                  entry.fileName
                    .split("/")
                    [entry.fileName.split("/").length - 1].split(".")[0].replace('image' , '')
                ),
                t: x.data.text,
              });

              console.log("processed image ", entry.fileName);

              zipfile.readEntry();
            });

            // readStream.pipe(fs.createWriteStream());
            readStream.on("data", (chunk) => {
              chunks.push(chunk);
            });
          });
        } else {
          zipfile.readEntry();
        }
      }
    });

    zipfile.on("end", function () {
      pages = pages.sort((a, b) => a.p - b.p);
      fs.writeFileSync("out.txt", pages.map((x) => x.t).join("\n\n"));
      console.log("Done!");
    });
  });
}
(async () => {
  pptocr(process.argv[process.argv.length - 1]);
})();



/* ======================
   ELEMENTOS DO HTML
====================== */
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const btnWebcam = document.getElementById("btn-webcam");
const btnSnap = document.getElementById("btn-snap");
const btnClear = document.getElementById("btn-clear");
const inputFile = document.getElementById("input-file");
const btnStop = document.getElementById("btn-stop");


const resultsEl = document.getElementById("results");

let currentFacing = "environment";
let stream = null;

/* ======================
   ABRIR CÂMERA
====================== */
async function openCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: currentFacing }
        });

        video.srcObject = stream;

        video.style.display = "block";
        canvas.style.display = "none";

        btnSnap.disabled = false;

    } catch (err) {
        alert("Permissão da câmera negada!");
        console.log("Erro da câmera:", err);
    }
    btnSnap.disabled = false;
    btnStop.disabled = false;

    
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    video.srcObject = null;

    btnStop.disabled = true;
    btnSnap.disabled = true;

    video.style.display = "none";
    canvas.style.display = "none";

    resultsEl.innerHTML = "Câmera parada.";
}


btnWebcam.onclick = () => openCamera();
btnStop.onclick = () => stopCamera();


/* ======================
   CAPTURAR DA CÂMERA
====================== */
btnSnap.onclick = () => {

    if (!video.srcObject) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    video.style.display = "none";
    canvas.style.display = "block";

        // Cria um objeto Image com o conteúdo atual do canvas
    const img = new Image();
    img.src = canvas.toDataURL("image/jpeg");

    img.onload = () => {
        const base64 = resizeImageToFixedSize(img);
        inferImage(base64);
};
    const resized = resizeImageToFixedSize(img);
    inferImage(resized);
 

};

/* ======================
     LIMPAR
====================== */
btnClear.onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resultsEl.innerHTML = "Nenhuma análise ainda.";

    canvas.style.display = "none";
    video.style.display = "block";
};

/* ======================
   UPLOAD DE IMAGEM
====================== */
inputFile.onchange = () => {
    const file = inputFile.files[0];
    const img = new Image();

    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        video.style.display = "none";
        canvas.style.display = "block";

        const base64 = canvas.toDataURL("image/jpeg").replace("data:image/jpeg;base64,", "");
        inferImage(base64);
    };

    img.src = URL.createObjectURL(file);
};

/* ======================
     ENVIAR PRO ROBOFLOW
====================== */
async function inferImage(base64) {
    resultsEl.innerHTML = "Analisando...";

    try {
        const resp = await fetch(
             `https://detect.roboflow.com/residuos-solidos-4rwsz/4?api_key=UKTDnAzGzevtJGFcTuyX&format=json`,
            {
                method: "POST",
                body: base64
            }
        );

        if (!resp.ok) {
            resultsEl.innerHTML = "Erro na análise.";
            console.log("Erro HTTP:", resp.status);
            return;
        }

        const data = await resp.json();

        if (!data.predictions || data.predictions.length === 0) {
            resultsEl.innerHTML = "Nenhum resíduo detectado.";
            return;
        }

        drawBoxes(data.predictions, data.image);

        resultsEl.innerHTML = data.predictions
            .map(p => `${p.class} — ${(p.confidence * 100).toFixed(1)}%`)
            .join("<br>");

    } catch (err) {
        console.error("ERRO AO ENVIAR:", err);
        resultsEl.innerHTML = "Falha ao enviar a imagem.";
    }
}

/* ======================
     DESENHAR CAIXAS
====================== */
function drawBoxes(predictions, imgSize) {
    if (!predictions) return;

    predictions.forEach(p => {

        const x = (p.x - p.width / 2) / imgSize.width * canvas.width;
        const y = (p.y - p.height / 2) / imgSize.height * canvas.height;
        const w = (p.width / imgSize.width) * canvas.width;
        const h = (p.height / imgSize.height) * canvas.height;

        ctx.strokeStyle = "#00e1ff";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        const label = `${p.class} ${(p.confidence * 100).toFixed(1)}%`;

        ctx.fillStyle = "rgba(0,225,255,0.5)";
        ctx.fillRect(x, y - 24, ctx.measureText(label).width + 12, 24);

        ctx.fillStyle = "#000";
        ctx.font = "16px Arial";
        ctx.fillText(label, x + 6, y - 7);
    });
}

function resizeImageToFixedSize(img, width = 640, height = 640) {
    const offCanvas = document.createElement("canvas");
    const offCtx = offCanvas.getContext("2d");

    offCanvas.width = width;
    offCanvas.height = height;

    // Desenha a imagem dentro do tamanho padronizado
    offCtx.drawImage(img, 0, 0, width, height);

    // Retorna Base64 SEM o prefixo
    return offCanvas.toDataURL("image/jpeg").replace("data:image/jpeg;base64,", "");
}

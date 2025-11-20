/* ======================
      CONFIGURAÇÃO
   ====================== */
const API_KEY = "UKTDnAzGzevtJGFcTuyX";     // sua api key
const PROJECT = "residuos-solidos-4rwsz";   // nome do projeto
const VERSION = "4";                        // versão do modelo

/* ======================
    ELEMENTOS DO DOM
   ====================== */
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const btnWebcam = document.getElementById("btn-webcam");
const btnSnap = document.getElementById("btn-snap");
const fileInput = document.getElementById("input-file");
const resultsEl = document.getElementById("results");

let stream = null;

/* ======================
     DESENHAR IMAGEM
   ====================== */
function drawImageToCanvas(source){
    canvas.width = source.videoWidth || source.width;
    canvas.height = source.videoHeight || source.height;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
}

/* ======================
   ENVIAR PARA ROBOFLOW
   ====================== */
async function inferImage(base64){
    resultsEl.innerHTML = "Analisando...";

    const url = `https://detect.roboflow.com/residuos-solidos-4rwsz/4?api_key=UKTDnAzGzevtJGFcTuyX&format=json`;

    // converter base64 → blob
    const blob = await (await fetch(base64)).blob();

    const formData = new FormData();
    formData.append("file", blob, "image.jpg");

    try {
        const response = await fetch(url, { 
            method: "POST",
            body: formData
        });

        const text = await response.text();
        console.log("Resposta do Roboflow:", text);

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            resultsEl.innerHTML = "❌ Erro: retorno inválido do Roboflow.";
            return;
        }

        if (!data.predictions) {
            resultsEl.innerHTML = "❌ O modelo não retornou previsões.";
            return;
        }

        drawBoxes(data.predictions);

        if (data.predictions.length === 0) {
            resultsEl.innerHTML = "<i>Nenhum resíduo detectado.</i>";
        } else {
            resultsEl.innerHTML = data.predictions
                .map(p => `${p.class} — ${(p.confidence * 100).toFixed(1)}%`)
                .join("<br>");
        }

    } catch(err){
        resultsEl.innerHTML = "❌ Erro ao conectar ao Roboflow";
        console.error("ERRO NO FETCH:", err);
    }
}


/* ======================
     DESENHAR CAIXAS
   ====================== */
function drawBoxes(predictions){
    ctx.lineWidth = 3;

    predictions.forEach(p=>{
        const x = p.x - p.width/2;
        const y = p.y - p.height/2;

        ctx.strokeStyle = "#06b6d4";
        ctx.strokeRect(x, y, p.width, p.height);

        const label = `${p.class} ${(p.confidence*100).toFixed(1)}%`;

        ctx.fillStyle = "rgba(6,182,212,0.5)";
        ctx.fillRect(x, y - 20, ctx.measureText(label).width + 10, 20);

        ctx.fillStyle = "white";
        ctx.fillText(label, x + 5, y - 5);
    });
}

/* ======================
      WEBCAM
   ====================== */
btnWebcam.onclick = async ()=>{
    if(stream){
        stream.getTracks().forEach(t=>t.stop());
        stream = null;
        video.srcObject = null;
        btnWebcam.textContent = "Usar Webcam";
        btnSnap.disabled = true;
        return;
    }

    stream = await navigator.mediaDevices.getUserMedia({video:true});
    video.srcObject = stream;

    btnWebcam.textContent = "Parar Webcam";
    btnSnap.disabled = false;
};

btnSnap.onclick = ()=>{
    drawImageToCanvas(video);
    const base64 = canvas.toDataURL("image/jpeg");
    inferImage(base64);
};

/* ======================
       UPLOAD
   ====================== */
fileInput.onchange = ()=>{
    const file = fileInput.files[0];
    const img = new Image();

    img.onload = ()=>{
        drawImageToCanvas(img);
        const base64 = canvas.toDataURL("image/jpeg");
        inferImage(base64);
    };

    img.src = URL.createObjectURL(file);
};
/* ======================
       LIMPAR IMAGEM
   ====================== */
const btnClear = document.getElementById("btn-clear");

btnClear.onclick = () => {
    // Limpa o canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Remove texto do resultado
    resultsEl.innerHTML = "";

    // Reseta o src do video
    video.srcObject = null;

    // Se a webcam estiver ligada, desligar
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }

    // Resetar interface
    btnWebcam.textContent = "Usar Webcam";
    btnSnap.disabled = true;

    console.log("Imagem removida e webcam resetada.");
};
let currentStream = null;
let usingFrontCamera = true; // começa com a frontal

async function startCamera() {
    const constraints = {
        video: {
            facingMode: usingFrontCamera ? "user" : "environment"
        }
    };

    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    try {
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = document.getElementById("video");
        video.srcObject = currentStream;
    } catch (error) {
        console.error("Erro ao acessar a câmera:", error);
    }
}

document.getElementById("switchCameraBtn").addEventListener("click", () => {
    usingFrontCamera = !usingFrontCamera; // troca a flag
    startCamera(); // reinicia com a câmera oposta
});

/* ==========================
   SUPABASE CLIENT
========================== */

const SUPABASE_URL = "https://hrdtylxfkcsgyhghhptr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyZHR5bHhma2NzZ3loZ2hocHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODc3NzksImV4cCI6MjA5NTU2Mzc3OX0.DwnwVrOcYfTeiz18BJEvCipoeDUQ4t_dg3biuCtIe94";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ==========================
   AUTENTICAÇÃO / SEGURANÇA
========================== */

function checkAuth(){
    const user = localStorage.getItem("mf_usuario");

    if(!user){
        window.location.href = "index.html";
        return null;
    }

    return JSON.parse(user);
}

function logout(){
    localStorage.clear();
    window.location.href = "index.html";
}

/* ==========================
   FORMATAÇÃO
========================== */

function brl(value){
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(value || 0);
}

/* ==========================
   ESTADO GLOBAL
========================== */

let charts = {};

/* ==========================
   INIT DASHBOARD
========================== */

document.addEventListener("DOMContentLoaded", async () => {
    const user = checkAuth();
    if(!user) return;

    document.getElementById("userName").innerText = user.nome || "Usuário";

    await loadKPIs();
    await loadCharts();
});

/* ==========================
   KPIs
========================== */

async function loadKPIs(){

    try{

        const { data: assinaturas, error: errA } = await supabaseClient
            .from("assinaturas")
            .select("*");

        const { count: frotaCount } = await supabaseClient
            .from("veiculos")
            .select("*", { count: "exact", head: true });

        const { count: usuariosCount } = await supabaseClient
            .from("usuarios")
            .select("*", { count: "exact", head: true });

        if(errA) throw errA;

        let total = 0;

        (assinaturas || []).forEach(a => {
            total += Number(a.valor || 0);
        });

        document.getElementById("kpi-assinaturas").innerText =
            assinaturas?.length || 0;

        document.getElementById("kpi-custo").innerText =
            brl(total);

        document.getElementById("kpi-frota").innerText =
            frotaCount || 0;

        document.getElementById("kpi-usuarios").innerText =
            usuariosCount || 0;

    }catch(err){
        console.error("Erro KPIs:", err);
    }
}

/* ==========================
   GRÁFICOS
========================== */

async function loadCharts(){

    try{

        const { data: assinaturas } = await supabaseClient
            .from("assinaturas")
            .select("*");

        const segmentMap = {};
        const paymentMap = {};
        let total = 0;

        (assinaturas || []).forEach(a => {

            const valor = Number(a.valor || 0);
            total += valor;

            // segmento (se ainda não tiver FK resolve pelo id mesmo)
            const seg = a.segmento_id || "Sem segmento";
            segmentMap[seg] = (segmentMap[seg] || 0) + valor;

            // meio pagamento
            const pay = a.meio_pagamento_id || "Sem pagamento";
            paymentMap[pay] = (paymentMap[pay] || 0) + valor;

        });

        renderBarChart("chartSegmento", segmentMap);
        renderDoughnutChart("chartPagamento", paymentMap);

    }catch(err){
        console.error("Erro Charts:", err);
    }
}

/* ==========================
   CHART - BAR
========================== */

function renderBarChart(id, dataObj){

    if(charts[id]) charts[id].destroy();

    const ctx = document.getElementById(id);

    charts[id] = new Chart(ctx, {
        type: "bar",
        data: {
            labels: Object.keys(dataObj),
            datasets: [{
                data: Object.values(dataObj),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: { color: "#aaa" }
                },
                y: {
                    ticks: { color: "#aaa" }
                }
            }
        }
    });
}

/* ==========================
   CHART - DOUGHNUT
========================== */

function renderDoughnutChart(id, dataObj){

    if(charts[id]) charts[id].destroy();

    const ctx = document.getElementById(id);

    charts[id] = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: Object.keys(dataObj),
            datasets: [{
                data: Object.values(dataObj)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "right",
                    labels: {
                        color: "#ccc"
                    }
                }
            }
        }
    });
}

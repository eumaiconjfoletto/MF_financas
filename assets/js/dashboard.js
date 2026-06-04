/* ==========================
   ESTADO GLOBAL E CONTROLE
========================== */
let charts = {};

/* ==========================
   AUTENTICAÇÃO / SEGURANÇA
========================== */
function checkAuth() {
    const user = localStorage.getItem("mf_usuario");
    if (!user) {
        window.location.href = "index.html";
        return null;
    }
    return JSON.parse(user);
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

/* ==========================
   FORMATADORES
========================== */
function brl(value) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(value || 0);
}

/* ==========================
   INIT DASHBOARD
========================== */
document.addEventListener("DOMContentLoaded", async () => {
    const user = checkAuth();
    if (!user) return;

    document.getElementById("userName").innerText = user.nome || "Usuário";

    // Execução paralela das requisições para otimização de performance
    await Promise.all([
        loadKPIs(),
        loadCharts()
    ]);
});

/* ==========================
   CARREGAMENTO DE KPIs
========================== */
async function loadKPIs() {
    try {
        // CORREÇÃO: Resgate centralizado com tratamento individual de erros do Supabase Client nativo
        const { data: assinaturas, error: errA } = await supabaseClient
            .from("assinaturas")
            .select("*");
        if (errA) throw errA;

        const { count: frotaCount, error: errF } = await supabaseClient
            .from("veiculos")
            .select("*", { count: "exact", head: true });
        if (errF) throw errF;

        const { count: usuariosCount, error: errU } = await supabaseClient
            .from("usuarios")
            .select("*", { count: "exact", head: true });
        if (errU) throw errU;

        let totalCusto = 0;
        (assinaturas || []).forEach(a => {
            totalCusto += Number(a.valor || 0);
        });

        document.getElementById("kpi-assinaturas").innerText = assinaturas?.length || 0;
        document.getElementById("kpi-custo").innerText = brl(totalCusto);
        document.getElementById("kpi-frota").innerText = frotaCount || 0;
        document.getElementById("kpi-usuarios").innerText = usuariosCount || 0;

    } catch (err) {
        console.error("Erro ao processar indicadores (KPIs):", err.message || err);
    }
}

/* ==========================
   COMPILAÇÃO DE DADOS DE GRÁFICOS
========================== */
async function loadCharts() {
    try {
        const { data: assinaturas, error: errC } = await supabaseClient
            .from("assinaturas")
            .select("*");
        if (errC) throw errC;

        const segmentMap = {};
        const paymentMap = {};

        (assinaturas || []).forEach(a => {
            const valor = Number(a.valor || 0);

            // Resolução amigável de chaves vazias ou nulas
            const seg = a.segmento_id || "Sem segmento";
            segmentMap[seg] = (segmentMap[seg] || 0) + valor;

            const pay = a.meio_pagamento_id || "Sem pagamento";
            paymentMap[pay] = (paymentMap[pay] || 0) + valor;
        });

        renderBarChart("chartSegmento", segmentMap);
        renderDoughnutChart("chartPagamento", paymentMap);

    } catch (err) {
        console.error("Erro ao compilar dados dos gráficos:", err.message || err);
    }
}

/* ==========================
   CHART - BAR (Segmentos)
========================== */
function renderBarChart(id, dataObj) {
    if (charts[id]) charts[id].destroy();

    const ctx = document.getElementById(id);
    if (!ctx) return;

    // CORREÇÃO: Aplicação de Paleta Dark-Theme sintonizada (Laranja institucional + grades suaves)
    charts[id] = new Chart(ctx, {
        type: "bar",
        data: {
            labels: Object.keys(dataObj),
            datasets: [{
                data: Object.values(dataObj),
                backgroundColor: "rgba(255, 115, 0, 0.85)",
                borderColor: "#ff7300",
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => ` Custo: ${brl(context.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: "rgba(255, 255, 255, 0.07)" },
                    ticks: { color: "#b3b3b3" }
                },
                y: {
                    grid: { color: "rgba(255, 255, 255, 0.07)" },
                    ticks: { 
                        color: "#b3b3b3",
                        callback: (value) => brl(value)
                    }
                }
            }
        }
    });
}

/* ==========================
   CHART - DOUGHNUT (Pagamentos)
========================== */
function renderDoughnutChart(id, dataObj) {
    if (charts[id]) charts[id].destroy();

    const ctx = document.getElementById(id);
    if (!ctx) return;

    // CORREÇÃO: Injeção de espectro de cores harmônico e remoção de bordas brancas estouradas
    charts[id] = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: Object.keys(dataObj),
            datasets: [{
                data: Object.values(dataObj),
                backgroundColor: [
                    "#ff7300", // Laranja Primário
                    "#ff9543", // Laranja Médio
                    "#ffb884", // Laranja Claro/Pastel
                    "#4a4a4a", // Cinza Escuro
                    "#2d2d2d"  // Cinza Profundo
                ],
                borderColor: "#1e1e1e", // Casado perfeitamente com o fundo do widget card
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "right",
                    labels: {
                        color: "#e0e0e0",
                        font: { size: 12 },
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => ` Total: ${brl(context.raw)}`
                    }
                }
            }
        }
    });
}

// Globalização do escopo de ações para o HTML context
window.logout = logout;

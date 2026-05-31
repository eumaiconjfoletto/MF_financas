// ==========================
// VALIDAÇÃO DE LOGIN
// ==========================

const usuario = JSON.parse(localStorage.getItem("mf_usuario"));

if (!usuario) {
    window.location.href = "index.html";
}

// ==========================
// LOGOUT
// ==========================

function logout() {
    localStorage.removeItem("mf_usuario");
    localStorage.removeItem("mf_token");
    window.location.href = "index.html";
}

// ==========================
// SALVAR LANÇAMENTO
// ==========================

async function salvarLancamento() {

    const tipo = document.getElementById("tipo").value;
    const descricao = document.getElementById("descricao").value;
    const valor = parseFloat(document.getElementById("valor").value);

    if (!descricao || !valor) {
        alert("Preencha todos os campos");
        return;
    }

    try {

        const { error } = await supabaseClient
            .from("lancamentos")
            .insert([{
                tipo,
                descricao,
                valor,
                usuario_id: usuario.id,
                created_at: new Date()
            }]);

        if (error) throw error;

        document.getElementById("descricao").value = "";
        document.getElementById("valor").value = "";

        carregarLancamentos();

    } catch (err) {
        console.error(err);
        alert("Erro ao salvar lançamento");
    }
}

// ==========================
// LISTAR LANÇAMENTOS
// ==========================

async function carregarLancamentos() {

    const lista = document.getElementById("lista");

    const { data, error } = await supabaseClient
        .from("lancamentos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

    if (error) {
        console.error(error);
        return;
    }

    lista.innerHTML = "";

    data.forEach(item => {

        const cor = item.tipo === "receita" ? "text-green-400" : "text-red-400";

        lista.innerHTML += `
            <div class="simple-item">
                <div>
                    <strong class="${cor}">
                        ${item.tipo.toUpperCase()}
                    </strong>
                    <div class="text-sm text-zinc-400">
                        ${item.descricao}
                    </div>
                </div>

                <span>
                    R$ ${Number(item.valor).toFixed(2)}
                </span>
            </div>
        `;
    });

}

// inicializa
carregarLancamentos();

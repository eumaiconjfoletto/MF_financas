let categoriaEditando = null;
let idExclusaoCategoria = null;
let todasCategorias = [];

document.addEventListener('DOMContentLoaded', iniciarPagina);

async function iniciarPagina() {
    carregarUsuario();
    await carregarCategorias();
}

function carregarUsuario() {
    const usuario = JSON.parse(localStorage.getItem('mf_usuario'));
    if (usuario) {
        document.getElementById('userName').innerText = usuario.nome;
    }
}

async function carregarCategorias() {
    const { data, error } = await supabaseClient
        .from('categorias_lancamentos')
        .select('*')
        .order('nome');

    if (error) {
        console.error('Erro ao buscar categorias:', error.message);
        return;
    }

    todasCategorias = data || [];
    atualizarKPIs(todasCategorias);
    montarTabela(todasCategorias);
}

function atualizarKPIs(categorias) {
    document.getElementById('kpiTotal').innerText = categorias.length;
    document.getElementById('kpiReceitas').innerText = categorias.filter(c => c.tipo === 'receita').length;
    document.getElementById('kpiDespesas').innerText = categorias.filter(c => c.tipo === 'despesa').length;
}

function montarTabela(categorias) {
    const tbody = document.getElementById('listaCategorias');
    tbody.innerHTML = '';

    categorias.forEach(item => {
        // Formata visualmente o texto para o usuário final
        const tipoFormatado = item.tipo === 'receita' ? 'Receita' : 'Despesa';

        tbody.innerHTML += `
        <tr>
            <td>${item.nome}</td>
            <td>
                <span class="badge ${item.tipo === 'receita' ? 'badge-success' : 'badge-danger'}">
                    ${tipoFormatado}
                </span>
            </td>
            <td>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-secondary" onclick="editarCategoria('${item.id}')">Editar</button>
                    <button class="btn btn-danger" onclick="excluirCategoria('${item.id}')">Excluir</button>
                </div>
            </td>
        </tr>`;
    });
}

async function salvarCategoria() {
    const registro = {
        nome: document.getElementById('nome').value.trim(),
        tipo: document.getElementById('tipo').value
    };

    if (!registro.nome) {
        alert('Informe o nome da categoria.');
        return;
    }

    let erro;

    if (categoriaEditando) {
        // Atualização de categoria existente
        ({ error: erro } = await supabaseClient
            .from('categorias_lancamentos')
            .update(registro)
            .eq('id', categoriaEditando));
    } else {
        // Inserção de nova categoria
        ({ error: erro } = await supabaseClient
            .from('categorias_lancamentos')
            .insert(registro));
    }

    // CORREÇÃO: Tratamento de erros de restrições ou banco do Supabase
    if (erro) {
        alert('Erro ao salvar categoria: ' + erro.message);
        return;
    }

    fecharModalCategoria();
    await carregarCategorias();
}

async function editarCategoria(id) {
    const { data, error } = await supabaseClient
        .from('categorias_lancamentos')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        alert('Erro ao carregar dados da categoria: ' + error.message);
        return;
    }

    categoriaEditando = id;
    document.getElementById('nome').value = data.nome;
    document.getElementById('tipo').value = data.tipo;
    document.getElementById('tituloModalCategoria').innerText = 'Editar Categoria';

    abrirModalCategoria();
}

function excluirCategoria(id) {
    idExclusaoCategoria = id;
    document.getElementById('modalExcluirCategoria').classList.remove('hidden');
}

async function confirmarExclusaoCategoria() {
    if (!idExclusaoCategoria) return;

    // CORREÇÃO: Validação de erro no delete para capturar restrição de chave estrangeira
    const { error } = await supabaseClient
        .from('categorias_lancamentos')
        .delete()
        .eq('id', idExclusaoCategoria);

    if (error) {
        alert('Não foi possível excluir a categoria. Verifique se ela está sendo utilizada em algum lançamento financeiro.');
        console.error(error);
        return;
    }

    fecharModalExcluirCategoria();
    await carregarCategorias();
}

function abrirModalCategoria() {
    if (!categoriaEditando) {
        document.getElementById('tituloModalCategoria').innerText = 'Nova Categoria';
    }
    document.getElementById('modalCategoria').classList.remove('hidden');
}

function fecharModalCategoria() {
    document.getElementById('modalCategoria').classList.add('hidden');
    limparFormulario(); // Limpa estado de edição e dados residuais
}

function fecharModalExcluirCategoria() {
    idExclusaoCategoria = null;
    document.getElementById('modalExcluirCategoria').classList.add('hidden');
}

function limparFormulario() {
    categoriaEditando = null;
    document.getElementById('nome').value = '';
    document.getElementById('tipo').value = 'receita';
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Vinculação explícita dos métodos ao escopo do objeto Window para chamadas nativas inline
window.salvarCategoria = salvarCategoria;
window.editarCategoria = editarCategoria;
window.excluirCategoria = excluirCategoria;
window.confirmarExclusaoCategoria = confirmarExclusaoCategoria;
window.abrirModalCategoria = abrirModalCategoria;
window.fecharModalCategoria = fecharModalCategoria;
window.fecharModalExcluirCategoria = fecharModalExcluirCategoria;
window.logout = logout;

let veiculoEditando = null;
let idExclusaoVeiculo = null;
let todosVeiculos = [];

document.addEventListener('DOMContentLoaded', iniciarPagina);

async function iniciarPagina() {
    carregarUsuario();
    await carregarVeiculos();
}

function carregarUsuario() {
    const usuario = JSON.parse(localStorage.getItem('mf_usuario'));
    if (usuario) {
        document.getElementById('userName').innerText = usuario.nome;
    }
}

async function carregarVeiculos() {
    const { data, error } = await supabaseClient
        .from('veiculos')
        .select('*')
        .order('marca', { ascending: true });

    if (error) {
        console.error('Erro ao buscar veículos:', error.message);
        return;
    }

    todosVeiculos = data || [];
    atualizarKPIs(todosVeiculos);
    montarTabela(todosVeiculos);
}

function atualizarKPIs(veiculos) {
    document.getElementById('kpiTotal').innerText = veiculos.length;
    document.getElementById('kpiPlaca').innerText = veiculos.filter(v => v.placa && v.placa.trim() !== '').length;

    if (veiculos.length) {
        const veiculosComAno = veiculos.filter(v => v.ano && Number(v.ano) > 0);
        
        const mediaAno = veiculosComAno.length 
            ? Math.round(veiculosComAno.reduce((s, v) => s + Number(v.ano), 0) / veiculosComAno.length)
            : '-';

        document.getElementById('kpiAno').innerText = mediaAno;

        // CORREÇÃO: Utilizando clone estruturado [...veiculos] para evitar mutar a ordenação da tabela global
        const ultimo = [...veiculos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

        document.getElementById('kpiUltimo').innerText = `${ultimo.marca} ${ultimo.modelo}`;
    } else {
        document.getElementById('kpiAno').innerText = '-';
        document.getElementById('kpiUltimo').innerText = '-';
    }
}

function montarTabela(veiculos) {
    const tbody = document.getElementById('listaVeiculos');
    tbody.innerHTML = '';

    veiculos.forEach(item => {
        tbody.innerHTML += `
        <tr>
            <td>${item.marca || ''}</td>
            <td>${item.modelo || ''}</td>
            <td>${item.placa || '-'}</td>
            <td>${item.ano || '-'}</td>
            <td>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-secondary" onclick="editarVeiculo('${item.id}')">Editar</button>
                    <button class="btn btn-danger" onclick="excluirVeiculo('${item.id}')">Excluir</button>
                </div>
            </td>
        </tr>`;
    });
}

async function salvarVeiculo() {
    const registro = {
        marca: document.getElementById('marca').value.trim(),
        modelo: document.getElementById('modelo').value.trim(),
        placa: document.getElementById('placa').value.trim().toUpperCase(),
        ano: document.getElementById('ano').value ? Number(document.getElementById('ano').value) : null
    };

    if (!registro.marca) {
        alert('Informe a marca do veículo.');
        return;
    }

    if (!registro.modelo) {
        alert('Informe o modelo do veículo.');
        return;
    }

    let erro;

    if (veiculoEditando) {
        ({ error: erro } = await supabaseClient
            .from('veiculos')
            .update(registro)
            .eq('id', veiculoEditando));
    } else {
        ({ error: erro } = await supabaseClient
            .from('veiculos')
            .insert(registro));
    }

    // CORREÇÃO: Validação de erros de banco/restrições exclusiva do Supabase
    if (erro) {
        alert('Erro ao salvar veículo: ' + erro.message);
        return;
    }

    fecharModalVeiculo();
    await carregarVeiculos();
}

async function editarVeiculo(id) {
    const { data, error } = await supabaseClient
        .from('veiculos')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        alert('Erro ao carregar dados do veículo: ' + error.message);
        return;
    }

    veiculoEditando = id;

    document.getElementById('marca').value = data.marca || '';
    document.getElementById('modelo').value = data.modelo || '';
    document.getElementById('placa').value = data.placa || '';
    document.getElementById('ano').value = data.ano || '';
    
    document.getElementById('tituloModalVeiculo').innerText = 'Editar Veículo';

    abrirModalVeiculo();
}

function excluirVeiculo(id) {
    idExclusaoVeiculo = id;
    document.getElementById('modalExcluirVeiculo').classList.remove('hidden');
}

async function confirmarExclusaoVeiculo() {
    if (!idExclusaoVeiculo) return;

    // CORREÇÃO: Captura de erros ativa para gerenciar restrições de chaves estrangeiras em uso
    const { error } = await supabaseClient
        .from('veiculos')
        .delete()
        .eq('id', idExclusaoVeiculo);

    if (error) {
        alert('Não foi possível excluir o veículo. Verifique se existem despesas da frota ou lançamentos financeiros vinculados a ele.');
        console.error(error);
        return;
    }

    fecharModalExcluirVeiculo();
    await carregarVeiculos();
}

function abrirModalVeiculo() {
    if (!veiculoEditando) {
        document.getElementById('tituloModalVeiculo').innerText = 'Novo Veículo';
    }
    document.getElementById('modalVeiculo').classList.remove('hidden');
}

function fecharModalVeiculo() {
    document.getElementById('modalVeiculo').classList.add('hidden');
    limparFormulario(); // Executa o descarte de estado de edição residual
}

function fecharModalExcluirVeiculo() {
    idExclusaoVeiculo = null;
    document.getElementById('modalExcluirVeiculo').classList.add('hidden');
}

function limparFormulario() {
    veiculoEditando = null;
    document.getElementById('marca').value = '';
    document.getElementById('modelo').value = '';
    document.getElementById('placa').value = '';
    document.getElementById('ano').value = '';
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Vinculação estrita das chamadas em linha das views (HTML contextual scope)
window.salvarVeiculo = salvarVeiculo;
window.editarVeiculo = editarVeiculo;
window.excluirVeiculo = excluirVeiculo;
window.confirmarExclusaoVeiculo = confirmarExclusaoVeiculo;
window.abrirModalVeiculo = abrirModalVeiculo;
window.fecharModalVeiculo = fecharModalVeiculo;
window.fecharModalExcluirVeiculo = fecharModalExcluirVeiculo;
window.logout = logout;

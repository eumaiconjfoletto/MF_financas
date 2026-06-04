let despesaEditando = null;
let idExclusao = null;
let todasDespesas = [];

let veiculosMap = {};
let tiposMap = {};
let meiosMap = {};
let contasMap = {};

document.addEventListener('DOMContentLoaded', iniciarPagina);

async function iniciarPagina() {
    carregarUsuario();

    await carregarVeiculos();
    await carregarTiposDespesa();
    await carregarMeiosPagamento();
    await carregarContas();
    await carregarDespesas();

    document.getElementById('filtroVeiculo').addEventListener('change', filtrarDespesas);
    document.getElementById('filtroTipo').addEventListener('change', filtrarDespesas);
    document.getElementById('filtroInicio').addEventListener('change', filtrarDespesas);
    document.getElementById('filtroFim').addEventListener('change', filtrarDespesas);
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
        .order('marca');

    if (error) {
        console.error(error);
        return;
    }

    const select = document.getElementById('veiculo');
    const filtro = document.getElementById('filtroVeiculo');

    select.innerHTML = '<option value="">Selecione</option>';
    filtro.innerHTML = '<option value="">Todos</option>';

    data.forEach(item => {
        const nome = `${item.marca} ${item.modelo}`;
        veiculosMap[item.id] = nome;

        select.innerHTML += `<option value="${item.id}">${nome}</option>`;
        filtro.innerHTML += `<option value="${item.id}">${nome}</option>`;
    });
}

async function carregarTiposDespesa() {
    const { data, error } = await supabaseClient
        .from('tipos_despesa_frota')
        .select('*')
        .order('nome');

    if (error) {
        console.error(error);
        return;
    }

    const select = document.getElementById('tipoDespesa');
    const filtro = document.getElementById('filtroTipo');

    select.innerHTML = '<option value="">Selecione</option>';
    filtro.innerHTML = '<option value="">Todos</option>';

    data.forEach(item => {
        tiposMap[item.id] = item.nome;
        select.innerHTML += `<option value="${item.id}">${item.nome}</option>`;
        filtro.innerHTML += `<option value="${item.id}">${item.nome}</option>`;
    });
}

async function carregarMeiosPagamento() {
    const { data, error } = await supabaseClient
        .from('meios_pagamento')
        .select('*')
        .order('nome');

    if (error) {
        console.error(error);
        return;
    }

    const select = document.getElementById('meioPagamento');
    select.innerHTML = '<option value="">Selecione</option>';

    data.forEach(item => {
        meiosMap[item.id] = item.nome;
        select.innerHTML += `<option value="${item.id}">${item.nome}</option>`;
    });
}

async function carregarContas() {
    const { data, error } = await supabaseClient
        .from('contas_financeiras')
        .select('*')
        .eq('ativa', true)
        .order('nome');

    if (error) {
        console.error(error);
        return;
    }

    const select = document.getElementById('conta');
    select.innerHTML = '<option value="">Selecione</option>';

    data.forEach(item => {
        contasMap[item.id] = item.nome;
        select.innerHTML += `<option value="${item.id}">${item.nome}</option>`;
    });
}

async function carregarDespesas() {
    const { data, error } = await supabaseClient
        .from('despesas_frota')
        .select('*')
        .order('data_despesa', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    todasDespesas = data || [];
    filtrarDespesas();
}

function filtrarDespesas() {
    let lista = [...todasDespesas];

    const veiculo = document.getElementById('filtroVeiculo').value;
    const tipo = document.getElementById('filtroTipo').value;
    const inicio = document.getElementById('filtroInicio').value;
    const fim = document.getElementById('filtroFim').value;

    if (veiculo) {
        lista = lista.filter(x => x.veiculo_id === veiculo);
    }
    if (tipo) {
        lista = lista.filter(x => x.tipo_despesa_id === tipo);
    }
    if (inicio) {
        lista = lista.filter(x => x.data_despesa >= inicio);
    }
    if (fim) {
        lista = lista.filter(x => x.data_despesa <= fim);
    }

    atualizarKPIs(lista);
    montarTabela(lista);
}

function atualizarKPIs(lista) {
    const total = lista.reduce((soma, item) => soma + Number(item.valor || 0), 0);

    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    const totalMes = lista
        .filter(item => {
            if (!item.data_despesa) return false;
            
            // Correção de fuso horário local via split estrito do padrão YYYY-MM-DD
            const partes = item.data_despesa.split('-');
            const itemAno = parseInt(partes[0], 10);
            const itemMes = parseInt(partes[1], 10) - 1; 

            return itemMes === mesAtual && itemAno === anoAtual;
        })
        .reduce((soma, item) => soma + Number(item.valor || 0), 0);

    document.getElementById('kpiTotal').innerText = formatarMoeda(total);
    document.getElementById('kpiMes').innerText = formatarMoeda(totalMes);
    document.getElementById('kpiQtd').innerText = lista.length;

    const kms = lista.map(x => Number(x.quilometragem || 0)).filter(km => km > 0);
    document.getElementById('kpiKm').innerText = kms.length ? Math.max(...kms) : 0;
}

function montarTabela(lista) {
    const tbody = document.getElementById('listaFrota');
    tbody.innerHTML = '';

    lista.forEach(item => {
        tbody.innerHTML += `
        <tr>
            <td>${formatarData(item.data_despesa)}</td>
            <td>${veiculosMap[item.veiculo_id] || ''}</td>
            <td>${tiposMap[item.tipo_despesa_id] || ''}</td>
            <td>${meiosMap[item.meio_pagamento_id] || ''}</td>
            <td>${contasMap[item.conta_id] || ''}</td>
            <td>${formatarMoeda(item.valor || 0)}</td>
            <td>${item.quilometragem || ''}</td>
            <td>${item.observacao || ''}</td>
            <td>
                <button class="btn btn-secondary" onclick="editarDespesa('${item.id}')">Editar</button>
                <button class="btn btn-danger" onclick="excluirDespesa('${item.id}')">Excluir</button>
            </td>
        </tr>`;
    });
}

async function salvarDespesaFrota() {
    const registro = {
        veiculo_id: document.getElementById('veiculo').value,
        tipo_despesa_id: document.getElementById('tipoDespesa').value,
        meio_pagamento_id: document.getElementById('meioPagamento').value,
        conta_id: document.getElementById('conta').value,
        valor: Number(document.getElementById('valor').value || 0),
        quilometragem: document.getElementById('quilometragem').value ? Number(document.getElementById('quilometragem').value) : null,
        observacao: document.getElementById('observacao').value,
        data_despesa: document.getElementById('dataDespesa').value
    };

    if (!registro.veiculo_id || !registro.tipo_despesa_id || !registro.meio_pagamento_id || !registro.conta_id || !registro.valor || !registro.data_despesa) {
        alert('Preencha todos os campos obrigatórios.');
        return;
    }

    let erro;
    let lancamentoId = null;

    if (despesaEditando) {
        const atual = todasDespesas.find(x => x.id === despesaEditando);
        lancamentoId = atual?.lancamento_id || null;

        // 1. Atualiza o registro na tabela despesas_frota
        ({ error: erro } = await supabaseClient
            .from('despesas_frota')
            .update(registro)
            .eq('id', despesaEditando));

        if (erro) {
            alert('Erro ao atualizar despesa da frota: ' + erro.message);
            return;
        }

        // 2. CORREÇÃO: Atualiza o lançamento correspondente na tabela lancamentos
        if (lancamentoId) {
            const lancamentoAtualizado = {
                descricao: `Frota - ${tiposMap[registro.tipo_despesa_id]}`,
                valor: registro.valor,
                data_lancamento: registro.data_despesa,
                conta_id: registro.conta_id,
                observacao: registro.observacao,
                veiculo_id: registro.veiculo_id
            };

            const { error: erroLancamento } = await supabaseClient
                .from('lancamentos')
                .update(lancamentoAtualizado)
                .eq('id', lancamentoId);

            if (erroLancamento) {
                console.error('Erro ao sincronizar lançamento financeiro:', erroLancamento.message);
            }
        }
    } else {
        // Inserção de novo registro
        const lancamento = {
            descricao: `Frota - ${tiposMap[registro.tipo_despesa_id]}`,
            valor: registro.valor,
            tipo: 'despesa',
            categoria: 'Frota',
            data_lancamento: registro.data_despesa,
            conta_id: registro.conta_id,
            status: 'pago',
            observacao: registro.observacao,
            veiculo_id: registro.veiculo_id
        };

        const { data: lancamentoCriado, error: erroLancamento } = await supabaseClient
            .from('lancamentos')
            .insert(lancamento)
            .select()
            .single();

        if (erroLancamento) {
            alert('Erro ao criar lançamento financeiro: ' + erroLancamento.message);
            return;
        }

        registro.lancamento_id = lancamentoCriado.id;

        ({ error: erro } = await supabaseClient
            .from('despesas_frota')
            .insert(registro));

        if (erro) {
            alert('Erro ao salvar despesa: ' + erro.message);
            return;
        }
    }

    fecharModalFrota();
    await carregarDespesas();
}

async function editarDespesa(id) {
    const { data, error } = await supabaseClient
        .from('despesas_frota')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        alert(error.message);
        return;
    }

    despesaEditando = id;

    document.getElementById('veiculo').value = data.veiculo_id;
    document.getElementById('tipoDespesa').value = data.tipo_despesa_id;
    document.getElementById('meioPagamento').value = data.meio_pagamento_id;
    document.getElementById('conta').value = data.conta_id;
    document.getElementById('valor').value = data.valor;
    document.getElementById('quilometragem').value = data.quilometragem !== null ? data.quilometragem : '';
    document.getElementById('observacao').value = data.observacao || '';
    document.getElementById('dataDespesa').value = data.data_despesa;

    abrirModalFrota();
}

function excluirDespesa(id) {
    idExclusao = id;
    document.getElementById('modalExcluirFrota').classList.remove('hidden');
}

async function confirmarExclusaoFrota() {
    if (!idExclusao) return;

    const registro = todasDespesas.find(x => x.id === idExclusao);

    // CORREÇÃO: Remove primeiro de despesas_frota por restrições de Foreign Key (Chave Estrangeira)
    const { error: erroFrota } = await supabaseClient
        .from('despesas_frota')
        .delete()
        .eq('id', idExclusao);

    if (erroFrota) {
        alert('Erro ao excluir despesa da frota: ' + erroFrota.message);
        return;
    }

    if (registro && registro.lancamento_id) {
        const { error: erroLancamento } = await supabaseClient
            .from('lancamentos')
            .delete()
            .eq('id', registro.lancamento_id);

        if (erroLancamento) {
            console.error('Erro ao remover lançamento financeiro associado:', erroLancamento.message);
        }
    }

    fecharModalExcluirFrota();
    await carregarDespesas();
}

function abrirModalFrota() {
    document.getElementById('tituloModalFrota').innerText = despesaEditando ? 'Editar Despesa' : 'Nova Despesa';
    document.getElementById('modalFrota').classList.remove('hidden');
}

function fecharModalFrota() {
    document.getElementById('modalFrota').classList.add('hidden');
    limparFormulario(); // Garante a limpeza do estado de edição ao fechar voluntariamente
}

function fecharModalExcluirFrota() {
    idExclusao = null;
    document.getElementById('modalExcluirFrota').classList.add('hidden');
}

function limparFormulario() {
    despesaEditando = null;
    document.getElementById('veiculo').value = '';
    document.getElementById('tipoDespesa').value = '';
    document.getElementById('meioPagamento').value = '';
    document.getElementById('conta').value = '';
    document.getElementById('valor').value = '';
    document.getElementById('quilometragem').value = '';
    document.getElementById('observacao').value = '';
    document.getElementById('dataDespesa').value = '';
}

function formatarMoeda(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatarData(dataStr) {
    if (!dataStr) return '';
    const partes = dataStr.split('-');
    if (partes.length !== 3) return dataStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Vinculação estrita ao escopo global para chamadas inline do HTML
window.salvarDespesaFrota = salvarDespesaFrota;
window.editarDespesa = editarDespesa;
window.excluirDespesa = excluirDespesa;
window.confirmarExclusaoFrota = confirmarExclusaoFrota;
window.abrirModalFrota = abrirModalFrota;
window.fecharModalFrota = fecharModalFrota;
window.fecharModalExcluirFrota = fecharModalExcluirFrota;
window.logout = logout;

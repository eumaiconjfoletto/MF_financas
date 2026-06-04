let despesaEditando = null;
let idExclusao = null;

let todas = [];

let veiculosMap = {};
let tiposMap = {};
let meiosMap = {};

document.addEventListener(
'DOMContentLoaded',
iniciar
);

async function iniciar(){


carregarUsuario();

await carregarVeiculos();
await carregarTipos();
await carregarMeios();
await carregarContas();

await carregar();

document.getElementById(
    'filtroVeiculo'
).addEventListener(
    'change',
    filtrar
);

document.getElementById(
    'filtroTipo'
).addEventListener(
    'change',
    filtrar
);

document.getElementById(
    'filtroInicio'
).addEventListener(
    'change',
    filtrar
);

document.getElementById(
    'filtroFim'
).addEventListener(
    'change',
    filtrar
);


}

function carregarUsuario(){


const usuario =
    JSON.parse(
        localStorage.getItem(
            'mf_usuario'
        )
    );

if(usuario){

    document.getElementById(
        'userName'
    ).innerText =
        usuario.nome;

}


}

async function carregarVeiculos(){


const { data } =
    await supabaseClient
        .from('veiculos')
        .select('*')
        .order('marca');

const veiculo =
    document.getElementById(
        'veiculo'
    );

const filtro =
    document.getElementById(
        'filtroVeiculo'
    );

veiculo.innerHTML =
    '<option value="">Selecione</option>';

filtro.innerHTML =
    '<option value="">Todos</option>';

data.forEach(item => {

    const nome =
        `${item.marca} ${item.modelo}`;

    veiculosMap[item.id] = nome;

    veiculo.innerHTML += `
        <option value="${item.id}">
            ${nome}
        </option>
    `;

    filtro.innerHTML += `
        <option value="${item.id}">
            ${nome}
        </option>
    `;

});


}

async function carregarTipos(){


const { data } =
    await supabaseClient
        .from('tipos_despesa_frota')
        .select('*')
        .order('nome');

const tipo =
    document.getElementById(
        'tipoDespesa'
    );

const filtro =
    document.getElementById(
        'filtroTipo'
    );

tipo.innerHTML =
    '<option value="">Selecione</option>';

filtro.innerHTML =
    '<option value="">Todos</option>';

data.forEach(item => {

    tiposMap[item.id] =
        item.nome;

    tipo.innerHTML += `
        <option value="${item.id}">
            ${item.nome}
        </option>
    `;

    filtro.innerHTML += `
        <option value="${item.id}">
            ${item.nome}
        </option>
    `;

});


}

async function carregarMeios(){


const { data } =
    await supabaseClient
        .from('meios_pagamento')
        .select('*')
        .order('nome');

const meio =
    document.getElementById(
        'meioPagamento'
    );

meio.innerHTML =
    '<option value="">Selecione</option>';

data.forEach(item => {

    meiosMap[item.id] =
        item.nome;

    meio.innerHTML += `
        <option value="${item.id}">
            ${item.nome}
        </option>
    `;

});


}

async function carregarContas(){


const { data } =
    await supabaseClient
        .from('contas_financeiras')
        .select('*')
        .eq('ativa', true)
        .order('nome');

const conta =
    document.getElementById(
        'conta'
    );

conta.innerHTML =
    '<option value="">Selecione</option>';

data.forEach(item => {

    conta.innerHTML += `
        <option value="${item.id}">
            ${item.nome}
        </option>
    `;

});


}

async function carregar(){


const { data } =
    await supabaseClient
        .from('despesas_frota')
        .select('*')
        .order(
            'data_despesa',
            { ascending:false }
        );

todas = data || [];

filtrar();


}

function filtrar(){


let lista =
    [...todas];

const veiculo =
    document.getElementById(
        'filtroVeiculo'
    ).value;

const tipo =
    document.getElementById(
        'filtroTipo'
    ).value;

const inicio =
    document.getElementById(
        'filtroInicio'
    ).value;

const fim =
    document.getElementById(
        'filtroFim'
    ).value;

if(veiculo){

    lista =
        lista.filter(
            x => x.veiculo_id === veiculo
        );

}

if(tipo){

    lista =
        lista.filter(
            x => x.tipo_despesa_id === tipo
        );

}

if(inicio){

    lista =
        lista.filter(
            x => x.data_despesa >= inicio
        );

}

if(fim){

    lista =
        lista.filter(
            x => x.data_despesa <= fim
        );

}

atualizarKPIs(lista);

montarTabela(lista);


}

function atualizarKPIs(lista){


const total =
    lista.reduce(
        (s,i) =>
            s + Number(i.valor || 0),
        0
    );

const hoje =
    new Date();

const mesAtual =
    hoje.getMonth() + 1;

const anoAtual =
    hoje.getFullYear();

const totalMes =
    lista
        .filter(item => {

            if(!item.data_despesa)
                return false;

            const data =
                new Date(
                    item.data_despesa
                );

            return (
                data.getMonth()+1
                === mesAtual
                &&
                data.getFullYear()
                === anoAtual
            );

        })
        .reduce(
            (s,i)=>
                s + Number(i.valor || 0),
            0
        );

document.getElementById(
    'kpiTotal'
).innerText =
    formatarMoeda(total);

document.getElementById(
    'kpiMes'
).innerText =
    formatarMoeda(totalMes);

document.getElementById(
    'kpiQtd'
).innerText =
    lista.length;

document.getElementById(
    'kpiKm'
).innerText =
    lista.length
        ? Math.max(
            ...lista.map(
                x =>
                Number(
                    x.quilometragem || 0
                )
            )
        )
        : 0;


}

function montarTabela(lista){


const tbody =
    document.getElementById(
        'listaFrota'
    );

tbody.innerHTML = '';

lista.forEach(item => {

    tbody.innerHTML += `

    <tr>

        <td>${item.data_despesa || ''}</td>

        <td>${veiculosMap[item.veiculo_id] || ''}</td>

        <td>${tiposMap[item.tipo_despesa_id] || ''}</td>

        <td>${meiosMap[item.meio_pagamento_id] || ''}</td>

        <td>${formatarMoeda(item.valor || 0)}</td>

        <td>${item.quilometragem || ''}</td>

        <td>${item.observacao || ''}</td>

        <td>

            <button
                class="btn btn-secondary"
                onclick="editar('${item.id}')">

                Editar

            </button>

            <button
                class="btn btn-danger"
                onclick="excluir('${item.id}')">

                Excluir

            </button>

        </td>

    </tr>

    `;

});

}

async function salvarDespesaFrota(){


const obj = {

    veiculo_id:
        document.getElementById('veiculo').value,

    tipo_despesa_id:
        document.getElementById('tipoDespesa').value,

    meio_pagamento_id:
        document.getElementById('meioPagamento').value,

    valor:
        Number(
            document.getElementById('valor').value
        ),

    quilometragem:
        Number(
            document.getElementById('quilometragem').value || 0
        ),

    observacao:
        document.getElementById('observacao').value,

    data_despesa:
        document.getElementById('dataDespesa').value

};

if(
    !registro.veiculo_id ||
    !registro.tipo_despesa_id ||
    !registro.meio_pagamento_id ||
    !registro.valor ||
    !registro.data_despesa
){

    alert(
        'Preencha todos os campos obrigatórios.'
    );

    return;

}

let erro;

if(despesaEditando){

    ({ error: erro } =
        await supabaseClient
            .from('despesas_frota')
            .update(registro)
            .eq('id', despesaEditando));

}else{

    ({ error: erro } =
        await supabaseClient
            .from('despesas_frota')
            .insert(registro));

}

if(erro){

    alert(
        erro.message
    );

    return;

}

fecharModalFrota();

limparFormulario();

await carregar();


}
let resultado;

if (despesaEditando) {

    resultado = await supabaseClient
        .from('despesas_frota')
        .update(registro)
        .eq('id', despesaEditando);

} else {

    resultado = await supabaseClient
        .from('despesas_frota')
        .insert(registro);

}

if (resultado.error) {

    console.error(resultado.error);

    alert(
        'Erro ao salvar despesa.'
    );

    return;

}

async function editar(id){


const { data } =
    await supabaseClient
        .from('despesas_frota')
        .select('*')
        .eq('id', id)
        .single();

despesaEditando = id;

document.getElementById('veiculo').value =
    data.veiculo_id;

document.getElementById('tipoDespesa').value =
    data.tipo_despesa_id;

document.getElementById('meioPagamento').value =
    data.meio_pagamento_id;

document.getElementById('valor').value =
    data.valor;

document.getElementById('quilometragem').value =
    data.quilometragem;

document.getElementById('observacao').value =
    data.observacao || '';

document.getElementById('dataDespesa').value =
    data.data_despesa;

document.getElementById(
    'tituloModalFrota'
).innerText =
    'Editar Despesa';

abrirModalFrota();


}

function excluir(id){


idExclusao = id;

document
    .getElementById(
        'modalExcluirFrota'
    )
    .classList
    .remove('hidden');


}

async function confirmarExclusaoFrota(){


if(!idExclusao){
    return;
}

await supabaseClient
    .from('despesas_frota')
    .delete()
    .eq('id', idExclusao);

fecharModalExcluirFrota();

await carregar();


}

function abrirModalFrota(){


document
    .getElementById(
        'modalFrota'
    )
    .classList
    .remove('hidden');


}

function fecharModalFrota(){


document
    .getElementById(
        'modalFrota'
    )
    .classList
    .add('hidden');


}

function fecharModalExcluirFrota(){


idExclusao = null;

document
    .getElementById(
        'modalExcluirFrota'
    )
    .classList
    .add('hidden');


}

function limparFormulario(){


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

function formatarMoeda(valor){


return Number(valor).toLocaleString(
    'pt-BR',
    {
        style:'currency',
        currency:'BRL'
    }
);


}

function logout(){


localStorage.clear();

window.location.href =
    'index.html';


}

window.salvarDespesaFrota = salvarDespesaFrota;
window.editar = editar;
window.excluir = excluir;
window.confirmarExclusaoFrota = confirmarExclusaoFrota;
window.abrirModalFrota = abrirModalFrota;
window.fecharModalFrota = fecharModalFrota;
window.fecharModalExcluirFrota = fecharModalExcluirFrota;
window.logout = logout;

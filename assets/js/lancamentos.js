let lancamentoEditando = null;

let contasMap = {};

let todosLancamentos = [];

document.addEventListener(
    'DOMContentLoaded',
    iniciarPagina
);

async function iniciarPagina(){

    carregarUsuario();

    await carregarContas();

    await carregarCategorias();

    await carregarLancamentos();
    
    document
    .getElementById(
        'buscaDescricao'
    )
    .addEventListener(
        'keyup',
        aplicarFiltros
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

        const userName =
            document.getElementById(
                'userName'
            );

        if(userName){

            userName.innerText =
                usuario.nome;

        }

    }

}

async function carregarContas(){

    const { data, error } =
        await supabaseClient
            .from('contas_financeiras')
            .select('*')
            .eq('ativa', true)
            .order('nome');

    if(error){

        console.error(error);
        return;

    }

    const conta =
        document.getElementById(
            'conta'
        );

    const filtroConta =
        document.getElementById(
            'filtroConta'
        );

    conta.innerHTML = '';

    filtroConta.innerHTML =
        '<option value="">Todas</option>';

    data.forEach(item => {

    contasMap[item.id] = item.nome;

    conta.innerHTML += `
        <option value="${item.id}">
            ${item.nome}
        </option>
    `;

    filtroConta.innerHTML += `
        <option value="${item.id}">
            ${item.nome}
        </option>
    `;

});

}

async function carregarCategorias(){

    const { data, error } =
        await supabaseClient
            .from('categorias_lancamentos')
            .select('*')
            .order('nome');

    if(error){

        console.error(error);
        return;

    }

    const categoria =
        document.getElementById(
            'categoria'
        );

    categoria.innerHTML = '';

    data.forEach(item => {

        categoria.innerHTML += `
            <option value="${item.nome}">
                ${item.nome}
            </option>
        `;

    });

}

async function carregarLancamentos(){

    const { data, error } =
        await supabaseClient
            .from('lancamentos')
            .select('*')
            .order(
                'data_lancamento',
                { ascending:false }
            );

    if(error){

        console.error(error);
        return;

    }

    todosLancamentos = data;

    aplicarFiltros();

}

function atualizarKPIs(lancamentos){

    const receitas =
        lancamentos
            .filter(
                l => l.tipo === 'receita'
            )
            .reduce(
                (s,l) => s + Number(l.valor),
                0
            );

    const despesas =
        lancamentos
            .filter(
                l => l.tipo === 'despesa'
            )
            .reduce(
                (s,l) => s + Number(l.valor),
                0
            );

    const pendentes =
        lancamentos
            .filter(
                l => l.status === 'pendente'
            )
            .length;

    document.getElementById(
        'kpiReceitas'
    ).innerText =
    formatarMoeda(receitas);

    document.getElementById(
        'kpiDespesas'
    ).innerText =
    formatarMoeda(despesas);

    document.getElementById(
        'kpiSaldo'
    ).innerText =
    formatarMoeda(
        receitas - despesas
    );

    document.getElementById(
        'kpiPendentes'
    ).innerText =
    pendentes;

}

function montarTabela(lancamentos){

    const tbody =
        document.getElementById(
            'listaLancamentos'
        );

    tbody.innerHTML = '';

    lancamentos.forEach(item => {

        tbody.innerHTML += `

        <tr>

            <td>
                ${
                    item.data_lancamento
                    || ''
                }
            </td>

            <td>
                ${
                    item.descricao
                }
            </td>

            <td>
                ${
                    item.categoria
                }
            </td>

            <td>
                ${
                    contasMap[item.conta_id] || '-'
                }
            </td>

            <td>
                ${
                    formatarMoeda(
                        item.valor
                    )
                }
            </td>

            <td>

                <span class="
                    badge
                    ${
                        item.status === 'pago'
                        ? 'badge-success'
                        : 'badge-warning'
                    }
                ">

                    ${
                        item.status
                    }

                </span>

            </td>

            <td>

                <button
                    class="btn btn-secondary"
                    onclick="editarLancamento('${item.id}')">

                    Editar

                </button>

                <button
                    class="btn btn-danger"
                    onclick="excluirLancamento('${item.id}')">

                    Excluir

                </button>

            </td>

        </tr>

        `;

    });

}

async function salvarLancamento(){

    const registro = {

        tipo:
            document.getElementById(
                'tipo'
            ).value,

        descricao:
            document.getElementById(
                'descricao'
            ).value,

        valor:
            Number(
                document.getElementById(
                    'valor'
                ).value
            ),

        categoria:
            document.getElementById(
                'categoria'
            ).value,

        conta_id:
            document.getElementById(
                'conta'
            ).value,

        favorecido:
            document.getElementById(
                'favorecido'
            ).value,

        forma_pagamento:
            document.getElementById(
                'formaPagamento'
            ).value,

        documento:
            document.getElementById(
                'documento'
            ).value,

        data_vencimento:
            document.getElementById(
                'dataVencimento'
            ).value,

        competencia:
            document.getElementById(
                'competencia'
            ).value,

        status:
            document.getElementById(
                'status'
            ).value,

        observacao:
            document.getElementById(
                'observacao'
            ).value,

        data_lancamento:
            new Date()
                .toISOString()
                .split('T')[0]

    };

    if(lancamentoEditando){

        await supabaseClient
            .from('lancamentos')
            .update(registro)
            .eq(
                'id',
                lancamentoEditando
            );

    }else{

        await supabaseClient
            .from('lancamentos')
            .insert(registro);

    }

    limparFormulario();

    carregarLancamentos();

}

async function editarLancamento(id){

    const { data } =
        await supabaseClient
            .from('lancamentos')
            .select('*')
            .eq('id', id)
            .single();

    lancamentoEditando = id;

    document.getElementById('tipo').value =
        data.tipo;

    document.getElementById('descricao').value =
        data.descricao;

    document.getElementById('valor').value =
        data.valor;

    document.getElementById('categoria').value =
        data.categoria;

    document.getElementById('conta').value =
        data.conta_id;

    document.getElementById('favorecido').value =
        data.favorecido || '';

    document.getElementById('formaPagamento').value =
        data.forma_pagamento || '';

    document.getElementById('documento').value =
        data.documento || '';

    document.getElementById('dataVencimento').value =
        data.data_vencimento || '';

    document.getElementById('competencia').value =
        data.competencia || '';

    document.getElementById('status').value =
        data.status || 'pendente';

    document.getElementById('observacao').value =
        data.observacao || '';

}

async function excluirLancamento(id){

    if(
        !confirm(
            'Deseja excluir este lançamento?'
        )
    ){
        return;
    }

    await supabaseClient
        .from('lancamentos')
        .delete()
        .eq('id', id);

    carregarLancamentos();

}

function limparFormulario(){

    lancamentoEditando = null;

    document
        .querySelectorAll(
            '.input, .textarea'
        )
        .forEach(campo => {

            campo.value = '';

        });

}

function formatarMoeda(valor){

    return valor.toLocaleString(
        'pt-BR',
        {
            style:'currency',
            currency:'BRL'
        }
    );

}
function aplicarFiltros(){

    const busca =
        document
            .getElementById(
                'buscaDescricao'
            )
            .value
            .toLowerCase();

    let lista =
        [...todosLancamentos];

    if(busca){

        lista =
            lista.filter(item => {

                const descricao =
                    (
                        item.descricao || ''
                    ).toLowerCase();

                const favorecido =
                    (
                        item.favorecido || ''
                    ).toLowerCase();

                const documento =
                    (
                        item.documento || ''
                    ).toLowerCase();

                return (

                    descricao.includes(busca)

                    ||

                    favorecido.includes(busca)

                    ||

                    documento.includes(busca)

                );

            });

    }

    atualizarKPIs(lista);

    montarTabela(lista);

}

function logout(){

    localStorage.clear();

    window.location.href =
        'index.html';

}

window.salvarLancamento = salvarLancamento;
window.editarLancamento = editarLancamento;
window.excluirLancamento = excluirLancamento;
window.logout = logout;

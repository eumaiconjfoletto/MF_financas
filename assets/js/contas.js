let contaEditando = null;
let idExclusaoConta = null;

document.addEventListener(
    'DOMContentLoaded',
    iniciarPagina
);

async function iniciarPagina(){

    carregarUsuario();

    await carregarContas();

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

async function carregarContas(){

    const { data, error } =
        await supabaseClient
            .from('contas_financeiras')
            .select('*')
            .order('nome');

    if(error){

        console.error(error);
        return;

    }

    atualizarKPIs(data);

    montarTabela(data);

}

function atualizarKPIs(contas){

    document.getElementById(
        'kpiTotal'
    ).innerText =
    contas.length;

    document.getElementById(
        'kpiAtivas'
    ).innerText =
    contas.filter(
        c => c.ativa
    ).length;

}

function montarTabela(contas){

    const tbody =
        document.getElementById(
            'listaContas'
        );

    tbody.innerHTML = '';

    contas.forEach(conta => {

        tbody.innerHTML += `
        <tr>

            <td>
                ${conta.nome}
            </td>

            <td>
                R$ ${Number(
                    conta.saldo_inicial || 0
                ).toFixed(2)}
            </td>

            <td>

                <span class="
                    badge
                    ${conta.ativa
                        ? 'badge-success'
                        : 'badge-danger'}
                ">

                    ${conta.ativa
                        ? 'Ativa'
                        : 'Inativa'}

                </span>

            </td>

            <td>

                <div class="table-actions">

                    <button
                        class="btn btn-secondary"
                        onclick="editarConta('${conta.id}')">

                        Editar

                    </button>

                    <button
                        class="btn btn-danger"
                        onclick="excluirConta('${conta.id}')">

                        Excluir

                    </button>

                </div>

            </td>

        </tr>
        `;

    });

}

async function salvarConta(){

    const nome =
        document.getElementById(
            'nome'
        ).value.trim();

    const saldo =
        Number(
            document.getElementById(
                'saldo'
            ).value
        );

    const ativa =
        document.getElementById(
            'ativa'
        ).value === 'true';

    if(!nome){

        alert(
            'Informe o nome da conta.'
        );

        return;

    }

    if(contaEditando){

        await supabaseClient
            .from('contas_financeiras')
            .update({

                nome,
                saldo_inicial: saldo,
                ativa

            })
            .eq(
                'id',
                contaEditando
            );

    }
    else{

        await supabaseClient
            .from('contas_financeiras')
            .insert({

                nome,
                saldo_inicial: saldo,
                ativa

            });

    }

    limparFormulario();

    fecharModalConta();

    await carregarContas();

}

async function editarConta(id){

    const { data } =
        await supabaseClient
            .from('contas_financeiras')
            .select('*')
            .eq('id', id)
            .single();

    contaEditando = id;

    document.getElementById(
        'nome'
    ).value =
    data.nome;

    document.getElementById(
        'saldo'
    ).value =
    data.saldo_inicial;

    document.getElementById(
        'ativa'
    ).value =
    data.ativa.toString();

    document.getElementById(
    'tituloModalConta'
).innerText =
    'Editar Conta';

abrirModalConta();

}

function excluirConta(id){

    idExclusaoConta = id;

    document
        .getElementById(
            'modalExcluirConta'
        )
        .classList
        .remove(
            'hidden'
        );

}

async function confirmarExclusaoConta(){

    if(!idExclusaoConta){
        return;
    }

    await supabaseClient
        .from('contas_financeiras')
        .delete()
        .eq(
            'id',
            idExclusaoConta
        );

    fecharModalExcluirConta();

    await carregarContas();

}

function limparFormulario(){

    contaEditando = null;

    document.getElementById(
        'nome'
    ).value = '';

    document.getElementById(
        'saldo'
    ).value = 0;

    document.getElementById(
        'ativa'
    ).value = 'true';

}

function abrirModalConta(){

    if(!contaEditando){

        document.getElementById(
            'tituloModalConta'
        ).innerText =
            'Nova Conta';

    }

    document
        .getElementById(
            'modalConta'
        )
        .classList
        .remove(
            'hidden'
        );

}

function fecharModalConta(){

    document
        .getElementById(
            'modalConta'
        )
        .classList
        .add(
            'hidden'
        );

}

function fecharModalExcluirConta(){

    idExclusaoConta = null;

    document
        .getElementById(
            'modalExcluirConta'
        )
        .classList
        .add(
            'hidden'
        );

}

function logout(){

    localStorage.clear();

    window.location.href =
        'index.html';

}

window.salvarConta = salvarConta;
window.editarConta = editarConta;
window.excluirConta = excluirConta;

window.abrirModalConta =
    abrirModalConta;

window.fecharModalConta =
    fecharModalConta;

window.confirmarExclusaoConta =
    confirmarExclusaoConta;

window.fecharModalExcluirConta =
    fecharModalExcluirConta;

window.logout = logout;

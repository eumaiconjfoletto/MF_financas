let contaEditando = null;

document.addEventListener(
    'DOMContentLoaded',
    carregarContas
);

async function carregarContas() {

    const tbody =
        document.getElementById(
            'listaContas'
        );

    tbody.innerHTML = '';

    const { data, error } =
        await supabaseClient
            .from('contas_financeiras')
            .select('*')
            .order('nome');

    if (error) {

        console.error(error);
        return;

    }

    data.forEach(conta => {

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
                ${
                    conta.ativa
                    ? 'Ativa'
                    : 'Inativa'
                }
            </td>

            <td>

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

            </td>

        </tr>
        `;

    });

}

async function salvarConta() {

    const nome =
        document
        .getElementById('nome')
        .value
        .trim();

    const saldo =
        Number(
            document
            .getElementById('saldo')
            .value
        );

    const ativa =
        document
        .getElementById('ativa')
        .value === 'true';

    if (!nome) {

        alert(
            'Informe o nome da conta.'
        );

        return;
    }

    if (contaEditando) {

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

    } else {

        await supabaseClient
            .from('contas_financeiras')
            .insert({

                nome,
                saldo_inicial: saldo,
                ativa

            });

    }

    limparFormulario();

    carregarContas();

}

async function editarConta(id) {

    const { data } =
        await supabaseClient
            .from('contas_financeiras')
            .select('*')
            .eq('id', id)
            .single();

    contaEditando = id;

    document.getElementById('nome').value =
        data.nome;

    document.getElementById('saldo').value =
        data.saldo_inicial;

    document.getElementById('ativa').value =
        data.ativa.toString();

}

async function excluirConta(id) {

    if (
        !confirm(
            'Excluir esta conta?'
        )
    ) return;

    await supabaseClient
        .from('contas_financeiras')
        .delete()
        .eq('id', id);

    carregarContas();

}

function limparFormulario() {

    contaEditando = null;

    document.getElementById('nome').value = '';

    document.getElementById('saldo').value = 0;

    document.getElementById('ativa').value =
        'true';

}

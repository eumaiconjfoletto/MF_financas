let veiculoEditando = null;

let idExclusaoVeiculo = null;

let todosVeiculos = [];

document.addEventListener(
    'DOMContentLoaded',
    iniciarPagina
);

async function iniciarPagina(){

    carregarUsuario();

    await carregarVeiculos();

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

    const { data, error } =
        await supabaseClient
            .from('veiculos')
            .select('*')
            .order(
                'marca',
                {
                    ascending:true
                }
            );

    if(error){

        console.error(error);
        return;

    }

    todosVeiculos = data;

    atualizarKPIs(data);

    montarTabela(data);

}

function atualizarKPIs(veiculos){

    document.getElementById(
        'kpiTotal'
    ).innerText =
        veiculos.length;

    document.getElementById(
        'kpiPlaca'
    ).innerText =
        veiculos.filter(
            v => v.placa
        ).length;

    if(veiculos.length){

        const mediaAno = Math.round(

            veiculos.reduce(
                (s,v) =>
                    s + Number(v.ano || 0),
                0
            )

            /

            veiculos.length

        );

        document.getElementById(
            'kpiAno'
        ).innerText =
            mediaAno;

        const ultimo =
            veiculos
                .sort(
                    (a,b) =>
                        new Date(
                            b.created_at
                        )
                        -
                        new Date(
                            a.created_at
                        )
                )[0];

        document.getElementById(
            'kpiUltimo'
        ).innerText =
            ultimo.marca +
            ' ' +
            ultimo.modelo;

    }
    else{

        document.getElementById(
            'kpiAno'
        ).innerText =
            '-';

        document.getElementById(
            'kpiUltimo'
        ).innerText =
            '-';

    }

}

function montarTabela(veiculos){

    const tbody =
        document.getElementById(
            'listaVeiculos'
        );

    tbody.innerHTML = '';

    veiculos.forEach(item => {

        tbody.innerHTML += `

        <tr>

            <td>

                ${item.marca || ''}

            </td>

            <td>

                ${item.modelo || ''}

            </td>

            <td>

                ${item.placa || '-'}

            </td>

            <td>

                ${item.ano || '-'}

            </td>

            <td>

                <div
                    style="
                    display:flex;
                    gap:8px;
                    flex-wrap:wrap;
                ">

                    <button
                        class="btn btn-secondary"
                        onclick="editarVeiculo('${item.id}')">

                        Editar

                    </button>

                    <button
                        class="btn btn-danger"
                        onclick="excluirVeiculo('${item.id}')">

                        Excluir

                    </button>

                </div>

            </td>

        </tr>

        `;

    });

}

async function salvarVeiculo(){

    const registro = {

        marca:
            document
                .getElementById(
                    'marca'
                )
                .value
                .trim(),

        modelo:
            document
                .getElementById(
                    'modelo'
                )
                .value
                .trim(),

        placa:
            document
                .getElementById(
                    'placa'
                )
                .value
                .trim(),

        ano:
            Number(
                document
                    .getElementById(
                        'ano'
                    )
                    .value
            )

    };

    if(!registro.marca){

        alert(
            'Informe a marca.'
        );

        return;

    }

    if(!registro.modelo){

        alert(
            'Informe o modelo.'
        );

        return;

    }

    if(veiculoEditando){

        await supabaseClient
            .from('veiculos')
            .update(
                registro
            )
            .eq(
                'id',
                veiculoEditando
            );

    }
    else{

        await supabaseClient
            .from('veiculos')
            .insert(
                registro
            );

    }

    limparFormulario();

    fecharModalVeiculo();

    await carregarVeiculos();

}

async function editarVeiculo(id){

    const { data } =
        await supabaseClient
            .from('veiculos')
            .select('*')
            .eq(
                'id',
                id
            )
            .single();

    veiculoEditando = id;

    document.getElementById(
        'marca'
    ).value =
        data.marca || '';

    document.getElementById(
        'modelo'
    ).value =
        data.modelo || '';

    document.getElementById(
        'placa'
    ).value =
        data.placa || '';

    document.getElementById(
        'ano'
    ).value =
        data.ano || '';

    document.getElementById(
        'tituloModalVeiculo'
    ).innerText =
        'Editar Veículo';

    abrirModalVeiculo();

}

function excluirVeiculo(id){

    idExclusaoVeiculo = id;

    document
        .getElementById(
            'modalExcluirVeiculo'
        )
        .classList
        .remove(
            'hidden'
        );

}

async function confirmarExclusaoVeiculo(){

    if(!idExclusaoVeiculo){
        return;
    }

    await supabaseClient
        .from('veiculos')
        .delete()
        .eq(
            'id',
            idExclusaoVeiculo
        );

    fecharModalExcluirVeiculo();

    await carregarVeiculos();

}

function abrirModalVeiculo(){

    if(!veiculoEditando){

        document.getElementById(
            'tituloModalVeiculo'
        ).innerText =
            'Novo Veículo';

    }

    document
        .getElementById(
            'modalVeiculo'
        )
        .classList
        .remove(
            'hidden'
        );

}

function fecharModalVeiculo(){

    limparFormulario();

    document
        .getElementById(
            'modalVeiculo'
        )
        .classList
        .add(
            'hidden'
        );

}

function fecharModalExcluirVeiculo(){

    idExclusaoVeiculo = null;

    document
        .getElementById(
            'modalExcluirVeiculo'
        )
        .classList
        .add(
            'hidden'
        );

}

function limparFormulario(){

    veiculoEditando = null;

    document.getElementById(
        'marca'
    ).value = '';

    document.getElementById(
        'modelo'
    ).value = '';

    document.getElementById(
        'placa'
    ).value = '';

    document.getElementById(
        'ano'
    ).value = '';

}

function logout(){

    localStorage.clear();

    window.location.href =
        'index.html';

}

window.salvarVeiculo =
    salvarVeiculo;

window.editarVeiculo =
    editarVeiculo;

window.excluirVeiculo =
    excluirVeiculo;

window.confirmarExclusaoVeiculo =
    confirmarExclusaoVeiculo;

window.abrirModalVeiculo =
    abrirModalVeiculo;

window.fecharModalVeiculo =
    fecharModalVeiculo;

window.fecharModalExcluirVeiculo =
    fecharModalExcluirVeiculo;

window.logout =
    logout;

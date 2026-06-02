let categoriaEditando = null;

let idExclusaoCategoria = null;

let todasCategorias = [];

document.addEventListener(
    'DOMContentLoaded',
    iniciarPagina
);

async function iniciarPagina(){

    carregarUsuario();

    await carregarCategorias();

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

async function carregarCategorias(){

    const { data, error } =
        await supabaseClient
            .from(
                'categorias_lancamentos'
            )
            .select('*')
            .order(
                'nome'
            );

    if(error){

        console.error(error);
        return;

    }

    todasCategorias = data;

    atualizarKPIs(data);

    montarTabela(data);

}

function atualizarKPIs(categorias){

    document.getElementById(
        'kpiTotal'
    ).innerText =
        categorias.length;

    document.getElementById(
        'kpiReceitas'
    ).innerText =
        categorias.filter(
            c => c.tipo === 'receita'
        ).length;

    document.getElementById(
        'kpiDespesas'
    ).innerText =
        categorias.filter(
            c => c.tipo === 'despesa'
        ).length;

}

function montarTabela(categorias){

    const tbody =
        document.getElementById(
            'listaCategorias'
        );

    tbody.innerHTML = '';

    categorias.forEach(item => {

        tbody.innerHTML += `

        <tr>

            <td>

                ${item.nome}

            </td>

            <td>

                <span class="
                    badge
                    ${
                        item.tipo === 'receita'
                        ? 'badge-success'
                        : 'badge-danger'
                    }
                ">

                    ${item.tipo}

                </span>

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
                        onclick="editarCategoria('${item.id}')">

                        Editar

                    </button>

                    <button
                        class="btn btn-danger"
                        onclick="excluirCategoria('${item.id}')">

                        Excluir

                    </button>

                </div>

            </td>

        </tr>

        `;

    });

}

async function salvarCategoria(){

    const registro = {

        nome:
            document
                .getElementById(
                    'nome'
                )
                .value
                .trim(),

        tipo:
            document
                .getElementById(
                    'tipo'
                )
                .value

    };

    if(!registro.nome){

        alert(
            'Informe o nome da categoria.'
        );

        return;

    }

    if(categoriaEditando){

        await supabaseClient
            .from(
                'categorias_lancamentos'
            )
            .update(
                registro
            )
            .eq(
                'id',
                categoriaEditando
            );

    }else{

        await supabaseClient
            .from(
                'categorias_lancamentos'
            )
            .insert(
                registro
            );

    }

    limparFormulario();

    fecharModalCategoria();

    await carregarCategorias();

}

async function editarCategoria(id){

    const { data } =
        await supabaseClient
            .from(
                'categorias_lancamentos'
            )
            .select('*')
            .eq('id', id)
            .single();

    categoriaEditando = id;

    document.getElementById(
        'nome'
    ).value =
        data.nome;

    document.getElementById(
        'tipo'
    ).value =
        data.tipo;

    document.getElementById(
        'tituloModalCategoria'
    ).innerText =
        'Editar Categoria';

    abrirModalCategoria();

}

function excluirCategoria(id){

    idExclusaoCategoria = id;

    document
        .getElementById(
            'modalExcluirCategoria'
        )
        .classList
        .remove(
            'hidden'
        );

}

async function confirmarExclusaoCategoria(){

    if(!idExclusaoCategoria){
        return;
    }

    await supabaseClient
        .from(
            'categorias_lancamentos'
        )
        .delete()
        .eq(
            'id',
            idExclusaoCategoria
        );

    fecharModalExcluirCategoria();

    await carregarCategorias();

}

function abrirModalCategoria(){

    if(!categoriaEditando){

        document.getElementById(
            'tituloModalCategoria'
        ).innerText =
            'Nova Categoria';

    }

    document
        .getElementById(
            'modalCategoria'
        )
        .classList
        .remove(
            'hidden'
        );

}

function fecharModalCategoria(){

    limparFormulario();

    document
        .getElementById(
            'modalCategoria'
        )
        .classList
        .add(
            'hidden'
        );

}

function fecharModalExcluirCategoria(){

    idExclusaoCategoria = null;

    document
        .getElementById(
            'modalExcluirCategoria'
        )
        .classList
        .add(
            'hidden'
        );

}

function limparFormulario(){

    categoriaEditando = null;

    document.getElementById(
        'nome'
    ).value = '';

    document.getElementById(
        'tipo'
    ).value = 'receita';

}

function logout(){

    localStorage.clear();

    window.location.href =
        'index.html';

}

window.salvarCategoria =
    salvarCategoria;

window.editarCategoria =
    editarCategoria;

window.excluirCategoria =
    excluirCategoria;

window.confirmarExclusaoCategoria =
    confirmarExclusaoCategoria;

window.abrirModalCategoria =
    abrirModalCategoria;

window.fecharModalCategoria =
    fecharModalCategoria;

window.fecharModalExcluirCategoria =
    fecharModalExcluirCategoria;

window.logout =
    logout;
```

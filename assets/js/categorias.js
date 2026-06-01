let categoriaEditando = null;

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
            .from('categorias_lancamentos')
            .select('*')
            .order('nome');

    if(error){

        console.error(error);
        return;

    }

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

    categorias.forEach(cat => {

        tbody.innerHTML += `
        <tr>

            <td>
                ${cat.nome}
            </td>

            <td>

                <span class="
                    badge
                    ${
                        cat.tipo === 'receita'
                        ? 'badge-success'
                        : 'badge-danger'
                    }
                ">

                    ${
                        cat.tipo === 'receita'
                        ? 'Receita'
                        : 'Despesa'
                    }

                </span>

            </td>

            <td>

                <div class="table-actions">

                    <button
                        class="btn btn-secondary"
                        onclick="editarCategoria('${cat.id}')">

                        Editar

                    </button>

                    <button
                        class="btn btn-danger"
                        onclick="excluirCategoria('${cat.id}')">

                        Excluir

                    </button>

                </div>

            </td>

        </tr>
        `;

    });

}

async function salvarCategoria(){

    const nome =
        document.getElementById(
            'nome'
        ).value.trim();

    const tipo =
        document.getElementById(
            'tipo'
        ).value;

    if(!nome){

        alert(
            'Informe o nome da categoria.'
        );

        return;

    }

    if(categoriaEditando){

        await supabaseClient
            .from('categorias_lancamentos')
            .update({

                nome,
                tipo

            })
            .eq(
                'id',
                categoriaEditando
            );

    }
    else{

        await supabaseClient
            .from('categorias_lancamentos')
            .insert({

                nome,
                tipo

            });

    }

    limparFormulario();

    carregarCategorias();

}

async function editarCategoria(id){

    const { data } =
        await supabaseClient
            .from('categorias_lancamentos')
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

}

async function excluirCategoria(id){

    if(
        !confirm(
            'Deseja excluir esta categoria?'
        )
    ){
        return;
    }

    await supabaseClient
        .from('categorias_lancamentos')
        .delete()
        .eq('id', id);

    carregarCategorias();

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

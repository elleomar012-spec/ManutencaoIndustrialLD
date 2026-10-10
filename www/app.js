
const CHAVE_EQUIPAMENTOS = "manutencaoIndustrialLD_equipamentos";

let equipamentos = carregarEquipamentos();

function carregarEquipamentos() {
  try {
    const dados = localStorage.getItem(CHAVE_EQUIPAMENTOS);
    return dados ? JSON.parse(dados) : [];
  } catch (erro) {
    console.error("Não foi possível carregar os equipamentos.", erro);
    return [];
  }
}

function salvarEquipamentos() {
  try {
    localStorage.setItem(
      CHAVE_EQUIPAMENTOS,
      JSON.stringify(equipamentos)
    );
    renderizarEquipamentos();
    return true;
  } catch (erro) {
    alert("Não foi possível salvar os dados neste dispositivo.");
    console.error(erro);
    return false;
  }
}

function renderizarEquipamentos() {
  const lista = document.getElementById("listaEquipamentos");
  const total = document.getElementById("totalEquipamentos");
  const parados = document.getElementById("equipamentosParados");
  const ordens = document.getElementById("ordensAbertas");

  total.textContent = equipamentos.length;
  parados.textContent = equipamentos.filter(
    item => item.status === "Parado"
  ).length;

  // O módulo de ordens de serviço será implementado posteriormente.
  ordens.textContent = "0";

  lista.replaceChildren();

  if (equipamentos.length === 0) {
    const vazio = document.createElement("p");
    vazio.className = "vazio";
    vazio.textContent = "Nenhum equipamento cadastrado ainda.";
    lista.appendChild(vazio);
    return;
  }

  equipamentos.forEach(equipamento => {
    const cartao = document.createElement("article");
    cartao.className = "equipamento";

    const titulo = document.createElement("h3");
    titulo.textContent = equipamento.nome;
    cartao.appendChild(titulo);

    const identificacao = document.createElement("p");
    identificacao.textContent =
      "Identificação: " + (equipamento.identificacao || "Não informada");
    cartao.appendChild(identificacao);

    const setor = document.createElement("p");
    setor.textContent =
      "Setor: " + (equipamento.setor || "Não informado");
    cartao.appendChild(setor);

    const status = document.createElement("span");
    status.className = "status";

    if (equipamento.status === "Parado") {
      status.classList.add("parado");
    } else if (equipamento.status === "Em manutenção") {
      status.classList.add("manutencao");
    }

    status.textContent = equipamento.status;
    cartao.appendChild(status);

    const excluir = document.createElement("button");
    excluir.type = "button";
    excluir.textContent = "Excluir equipamento";
    excluir.addEventListener("click", () => {
      const confirmado = confirm(
        "Deseja excluir o equipamento " + equipamento.nome + "?"
      );

      if (!confirmado) return;

      equipamentos = equipamentos.filter(
        item => item.id !== equipamento.id
      );
      salvarEquipamentos();
    });

    cartao.appendChild(excluir);
    lista.appendChild(cartao);
  });
}

document
  .getElementById("formEquipamento")
  .addEventListener("submit", evento => {
    evento.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const identificacao = document
      .getElementById("identificacao")
      .value.trim();
    const setor = document.getElementById("setor").value.trim();
    const status = document.getElementById("status").value;

    if (!nome) {
      alert("Informe o nome do equipamento.");
      return;
    }

    equipamentos.push({
      id: Date.now().toString() + Math.random().toString(16).slice(2),
      nome,
      identificacao,
      setor,
      status,
      criadoEm: new Date().toISOString()
    });

    if (salvarEquipamentos()) {
      evento.target.reset();
      document.getElementById("nome").focus();
    }
  });

renderizarEquipamentos();

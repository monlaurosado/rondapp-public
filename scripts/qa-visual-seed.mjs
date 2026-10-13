#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

const CLEANUP_ONLY = process.argv.includes("--cleanup");
const LOCAL_FLAG = process.argv.includes("--local");
const PASSWORD = "Rondapp-Visual-Local-2026!";
const EMAIL_DOMAIN = "visual.rondapp.local";

const IDS = {
  activeGroup: "70000000-0000-4000-8000-000000000001",
  emptyGroup: "70000000-0000-4000-8000-000000000002",
  activeRound: "71000000-0000-4000-8000-000000000001",
  closedRound: "71000000-0000-4000-8000-000000000002",
  activeMoments: [
    "72000000-0000-4000-8000-000000000001",
    "72000000-0000-4000-8000-000000000002",
    "72000000-0000-4000-8000-000000000003",
    "72000000-0000-4000-8000-000000000004",
    "72000000-0000-4000-8000-000000000005",
  ],
  closedMoments: [
    "73000000-0000-4000-8000-000000000001",
    "73000000-0000-4000-8000-000000000002",
    "73000000-0000-4000-8000-000000000003",
  ],
};

const PEOPLE = [
  {
    key: "owner",
    email: `alex@${EMAIL_DOMAIN}`,
    username: "visual_alex",
    displayName: "Alexandra de la Sobremesa Interminable",
    birthdate: "1993-04-18",
  },
  {
    key: "one",
    email: `lucia@${EMAIL_DOMAIN}`,
    username: "visual_lucia",
    displayName: "Lucía",
    birthdate: "1997-11-02",
  },
  {
    key: "many",
    email: `marcos@${EMAIL_DOMAIN}`,
    username: "visual_marcos",
    displayName: "Marcos con muchísimos momentos compartidos",
    birthdate: "1990-08-27",
  },
  {
    key: "zero",
    email: `nora@${EMAIL_DOMAIN}`,
    username: "visual_nora",
    displayName: "Nora — todavía sin momentos esta semana",
    birthdate: "1999-01-14",
  },
  {
    key: "outsider",
    email: `olivia@${EMAIL_DOMAIN}`,
    username: "visual_olivia",
    displayName: "Olivia (ajena al grupo principal)",
    birthdate: "1995-06-09",
  },
];

const ACTIVE_MOMENTS = [
  {
    person: "owner",
    id: IDS.activeMoments[0],
    caption:
      "Una sobremesa larguísima bajo las luces de la terraza, con risas, historias y ese último brindis que nadie esperaba.",
    drinkType: "beer",
  },
  {
    person: "one",
    id: IDS.activeMoments[1],
    caption: "Llegué justo para el brindis ✨",
    drinkType: "soft_drink",
  },
  {
    person: "many",
    id: IDS.activeMoments[2],
    caption:
      "Primera parada de una noche que empezó tranquila y terminó llena de anécdotas para recordar durante todo el verano.",
    drinkType: "cocktail",
  },
  {
    person: "many",
    id: IDS.activeMoments[3],
    caption: null,
    drinkType: "water",
  },
  {
    person: "many",
    id: IDS.activeMoments[4],
    caption: "La foto espontánea que acabó siendo la favorita de la mesa.",
    drinkType: "prefer_not_say",
  },
];

const CLOSED_MOMENTS = [
  {
    person: "owner",
    id: IDS.closedMoments[0],
    caption: "El brindis ganador de la ronda anterior.",
    drinkType: "tinto",
  },
  {
    person: "one",
    id: IDS.closedMoments[1],
    caption:
      "Una foto con texto largo para comprobar el ajuste de líneas sin ocultar las acciones ni romper la tarjeta en pantalla.",
    drinkType: "cocktail",
  },
  {
    person: "many",
    id: IDS.closedMoments[2],
    caption: "Última foto antes de volver a casa.",
    drinkType: "zero_zero",
  },
];

function fail(message, cause) {
  throw new Error(message, cause ? { cause } : undefined);
}

function assertResult(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function parseStatusJson(raw) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    fail("No se pudo leer JSON desde `supabase status -o json`.");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function isLoopbackUrl(value) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function readLocalSupabaseConfig() {
  const fromEnv = {
    apiUrl: process.env.SUPABASE_LOCAL_URL,
    anonKey: process.env.SUPABASE_LOCAL_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY,
  };

  let config = fromEnv;
  if (!config.apiUrl || !config.anonKey || !config.serviceRoleKey) {
    try {
      const raw = execFileSync("npx", ["--yes", "supabase", "status", "-o", "json"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      const status = parseStatusJson(raw);
      config = {
        apiUrl: status.API_URL,
        anonKey: status.ANON_KEY,
        serviceRoleKey: status.SERVICE_ROLE_KEY,
      };
    } catch (error) {
      fail(
        "Supabase local no está disponible. Ejecuta `npx supabase start` y vuelve a intentarlo.",
        error,
      );
    }
  }

  if (!config.apiUrl || !config.anonKey || !config.serviceRoleKey) {
    fail("Faltan URL o claves de Supabase local.");
  }
  if (!isLoopbackUrl(config.apiUrl)) {
    fail("Seguridad: el seed visual solo acepta una URL loopback de Supabase local.");
  }
  return config;
}

function makeClient(url, key) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function listAllUsers(admin) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const data = assertResult(
      await admin.auth.admin.listUsers({ page, perPage: 100 }),
      "Listar usuarios locales",
    );
    users.push(...data.users);
    if (data.users.length < 100) return users;
  }
}

async function listStoredSeedPaths(admin) {
  const paths = [];
  for (const groupId of [IDS.activeGroup, IDS.emptyGroup]) {
    const rounds = assertResult(
      await admin.storage.from("moments").list(groupId, { limit: 1000 }),
      `Listar fotos del grupo visual ${groupId}`,
    );
    for (const round of rounds) {
      const roundPath = `${groupId}/${round.name}`;
      const users = assertResult(
        await admin.storage.from("moments").list(roundPath, { limit: 1000 }),
        `Listar fotos de la ronda visual ${round.name}`,
      );
      for (const user of users) {
        const userPath = `${roundPath}/${user.name}`;
        const files = assertResult(
          await admin.storage.from("moments").list(userPath, { limit: 1000 }),
          `Listar fotos del usuario visual ${user.name}`,
        );
        paths.push(
          ...files
            .filter((file) => file.name.toLowerCase().endsWith(".jpg"))
            .map((file) => `${userPath}/${file.name}`),
        );
      }
    }
  }
  return paths;
}

async function cleanup(admin) {
  const allUsers = await listAllUsers(admin);
  const seedUsers = allUsers.filter((user) =>
    PEOPLE.some((person) => person.email === user.email?.toLowerCase()),
  );

  const knownPaths = await listStoredSeedPaths(admin);
  const { data: storedMoments, error: momentError } = await admin
    .from("moments")
    .select("image_path")
    .in("group_id", [IDS.activeGroup, IDS.emptyGroup]);
  if (momentError && momentError.code !== "42P01") {
    throw new Error(`Leer fotos del seed: ${momentError.message}`);
  }
  knownPaths.push(...(storedMoments ?? []).map((moment) => moment.image_path));

  for (const user of seedUsers) {
    for (const moment of [...ACTIVE_MOMENTS, ...CLOSED_MOMENTS]) {
      const owner = PEOPLE.find((person) => person.key === moment.person);
      if (owner?.email === user.email?.toLowerCase()) {
        const roundId = ACTIVE_MOMENTS.includes(moment) ? IDS.activeRound : IDS.closedRound;
        knownPaths.push(momentPath(IDS.activeGroup, roundId, user.id, moment.id));
      }
    }
  }

  const uniquePaths = [...new Set(knownPaths)];

  const deletedMomentQueues = assertResult(
    await admin
      .from("moment_storage_deletions")
      .delete()
      .in("moment_id", [...IDS.activeMoments, ...IDS.closedMoments])
      .select("moment_id"),
    "Limpiar cola de borrado de momentos visuales",
  );

  const deletedCleanupQueuesByMoment = assertResult(
    await admin
      .from("storage_cleanup_queue")
      .delete()
      .in("source_id", [...IDS.activeMoments, ...IDS.closedMoments])
      .select("image_path"),
    "Limpiar cola de Storage por momento visual",
  );

  let deletedCleanupQueuesByPath = [];
  if (uniquePaths.length > 0) {
    deletedCleanupQueuesByPath = assertResult(
      await admin
        .from("storage_cleanup_queue")
        .delete()
        .in("image_path", uniquePaths)
        .select("image_path"),
      "Limpiar cola de Storage visual",
    );
  }

  if (uniquePaths.length > 0) {
    const result = await admin.storage.from("moments").remove(uniquePaths);
    if (result.error && !/not found/i.test(result.error.message)) {
      throw new Error(`Borrar fotos del seed: ${result.error.message}`);
    }
  }

  const deletedGroups = assertResult(
    await admin
      .from("social_groups")
      .delete()
      .in("id", [IDS.activeGroup, IDS.emptyGroup])
      .select("id"),
    "Borrar grupos del seed",
  );

  for (const user of seedUsers) {
    const result = await admin.auth.admin.deleteUser(user.id);
    if (result.error && !/not found/i.test(result.error.message)) {
      throw new Error(`Borrar usuario ${user.email}: ${result.error.message}`);
    }
  }

  return {
    usersRemoved: seedUsers.length,
    groupsRemoved: deletedGroups.length,
    storageObjectsRemoved: uniquePaths.length,
    queuedMomentDeletionsRemoved: deletedMomentQueues.length,
    queuedStorageCleanupsRemoved:
      deletedCleanupQueuesByMoment.length + deletedCleanupQueuesByPath.length,
  };
}

async function createPerson(admin, apiUrl, anonKey, person) {
  const authData = assertResult(
    await admin.auth.admin.createUser({
      email: person.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: person.displayName },
    }),
    `Crear usuario ${person.key}`,
  );
  if (!authData.user) fail(`Crear usuario ${person.key}: respuesta sin usuario.`);

  assertResult(
    await admin
      .from("profiles")
      .update({
        username: person.username,
        display_name: person.displayName,
        birthdate: person.birthdate,
        is_age_confirmed: true,
        accepted_terms_at: new Date().toISOString(),
      })
      .eq("id", authData.user.id),
    `Completar perfil ${person.key}`,
  );

  const client = makeClient(apiUrl, anonKey);
  const signIn = assertResult(
    await client.auth.signInWithPassword({ email: person.email, password: PASSWORD }),
    `Login ${person.key}`,
  );
  if (!signIn.session) fail(`Login ${person.key}: respuesta sin sesión.`);

  return { ...person, id: authData.user.id, client };
}

function momentPath(groupId, roundId, userId, momentId) {
  return `${groupId}/${roundId}/${userId}/${momentId}.jpg`;
}

async function uploadAndCreateMoment({
  image,
  person,
  groupId,
  roundId,
  moment,
  firstInRound = false,
}) {
  const path = momentPath(groupId, roundId, person.id, moment.id);
  assertResult(
    await person.client.storage.from("moments").upload(path, image, {
      contentType: "image/jpeg",
      upsert: false,
    }),
    `Subir foto ${moment.id}`,
  );

  const params = {
    p_round_id: roundId,
    p_moment_id: moment.id,
    p_image_path: path,
    p_caption: moment.caption,
    p_drink_type: moment.drinkType,
  };
  if (firstInRound) {
    params.p_group_id = groupId;
  }

  const rpcName = firstInRound ? "create_round_with_moment" : "create_moment";
  assertResult(await person.client.rpc(rpcName, params), `${rpcName} ${moment.id}`);
}

async function verifySeed(admin, people, ownerStats, outsiderVisibility) {
  const profiles = assertResult(
    await admin
      .from("profiles")
      .select("id, birthdate, is_age_confirmed")
      .in(
        "id",
        Object.values(people).map((person) => person.id),
      ),
    "Verificar perfiles",
  );
  assert(profiles.length === PEOPLE.length, "El seed no contiene los cinco perfiles esperados.");
  assert(
    profiles.every((profile) => profile.is_age_confirmed && profile.birthdate),
    "Todos los perfiles visuales deben tener edad confirmada y fecha de nacimiento.",
  );

  const groups = assertResult(
    await admin
      .from("social_groups")
      .select("id")
      .in("id", [IDS.activeGroup, IDS.emptyGroup]),
    "Verificar grupos",
  );
  assert(groups.length === 2, "El seed debe contener exactamente dos grupos conocidos.");

  const memberships = assertResult(
    await admin
      .from("group_members")
      .select("group_id, user_id")
      .in("group_id", [IDS.activeGroup, IDS.emptyGroup]),
    "Verificar membresías",
  );
  assert(memberships.length === 6, "El seed debe contener seis membresías.");

  const rounds = assertResult(
    await admin
      .from("rounds")
      .select("id, status, winner_moment_id")
      .in("id", [IDS.activeRound, IDS.closedRound]),
    "Verificar rondas",
  );
  const activeRound = rounds.find((round) => round.id === IDS.activeRound);
  const closedRound = rounds.find((round) => round.id === IDS.closedRound);
  assert(activeRound?.status === "active", "La ronda visual activa no quedó activa.");
  assert(closedRound?.status === "closed", "La ronda visual cerrada no quedó cerrada.");
  assert(Boolean(closedRound?.winner_moment_id), "La ronda cerrada no tiene momento ganador.");

  const moments = assertResult(
    await admin
      .from("moments")
      .select("id, round_id, user_id")
      .in("round_id", [IDS.activeRound, IDS.closedRound]),
    "Verificar momentos",
  );
  assert(moments.length === 8, "El seed debe contener ocho momentos.");
  const activeByUser = new Map();
  for (const moment of moments.filter((row) => row.round_id === IDS.activeRound)) {
    activeByUser.set(moment.user_id, (activeByUser.get(moment.user_id) ?? 0) + 1);
  }
  assert(!activeByUser.has(people.zero.id), "El usuario zero no debe tener momentos activos.");
  assert(activeByUser.get(people.one.id) === 1, "El usuario one debe tener un momento activo.");
  assert(activeByUser.get(people.many.id) === 3, "El usuario many debe tener tres momentos activos.");

  const reactions = assertResult(
    await admin
      .from("reactions")
      .select("moment_id, user_id")
      .in("round_id", [IDS.activeRound, IDS.closedRound]),
    "Verificar reacciones",
  );
  assert(reactions.length === 9, "El seed debe contener nueve reacciones.");
  assert(
    new Set(reactions.map((reaction) => `${reaction.moment_id}:${reaction.user_id}`)).size ===
      reactions.length,
    "Hay más de una reacción del mismo usuario en una foto.",
  );

  const stars = assertResult(
    await admin
      .from("photo_votes")
      .select("round_id, voter_id")
      .in("round_id", [IDS.activeRound, IDS.closedRound]),
    "Verificar Estrellas",
  );
  assert(stars.length === 8, "El seed debe contener ocho Estrellas.");
  assert(
    new Set(stars.map((star) => `${star.round_id}:${star.voter_id}`)).size === stars.length,
    "Hay más de una Estrella del mismo usuario en una ronda.",
  );

  assert(
    ownerStats?.total_moments === 2,
    "Las estadísticas privadas del owner deben sumar dos momentos.",
  );
  assert(
    ownerStats?.total_with_drink === 2 &&
      ownerStats?.by_drink?.beer === 1 &&
      ownerStats?.by_drink?.tinto === 1,
    "Las estadísticas privadas de bebida no coinciden con el seed.",
  );
  assert(outsiderVisibility === 0, "El usuario ajeno puede ver el grupo principal.");

  return {
    users: profiles.length,
    groups: groups.length,
    memberships: memberships.length,
    rounds: { active: 1, closed: 1 },
    moments: moments.length,
    reactions: reactions.length,
    stars: stars.length,
    closedWinnerPresent: true,
  };
}

async function seed(admin, apiUrl, anonKey) {
  const cleanupSummary = await cleanup(admin);
  const people = {};
  for (const definition of PEOPLE) {
    people[definition.key] = await createPerson(admin, apiUrl, anonKey, definition);
  }

  assertResult(
    await admin.from("social_groups").insert([
      {
        id: IDS.activeGroup,
        name: "Amistades de la terraza y sobremesa interminable",
        owner_id: people.owner.id,
        invite_code: "VISUALUNO",
      },
      {
        id: IDS.emptyGroup,
        name: "Grupo vacío para comprobar estados sin actividad",
        owner_id: people.owner.id,
        invite_code: "VISUALDOS",
      },
    ]),
    "Crear dos grupos privados",
  );

  assertResult(
    await admin.from("group_members").insert([
      { group_id: IDS.activeGroup, user_id: people.owner.id, role: "owner" },
      { group_id: IDS.activeGroup, user_id: people.one.id, role: "member" },
      { group_id: IDS.activeGroup, user_id: people.many.id, role: "member" },
      { group_id: IDS.activeGroup, user_id: people.zero.id, role: "member" },
      { group_id: IDS.emptyGroup, user_id: people.owner.id, role: "owner" },
      { group_id: IDS.emptyGroup, user_id: people.outsider.id, role: "member" },
    ]),
    "Crear miembros y usuario ajeno al grupo principal",
  );

  const image = new Uint8Array(
    await readFile(new URL("../assets/social/ronda-nova-hero.jpg", import.meta.url)),
  );

  for (const [index, moment] of ACTIVE_MOMENTS.entries()) {
    await uploadAndCreateMoment({
      image,
      person: people[moment.person],
      groupId: IDS.activeGroup,
      roundId: IDS.activeRound,
      moment,
      firstInRound: index === 0,
    });
  }
  assertResult(
    await admin
      .from("rounds")
      .update({ title: "La ronda activa con un título deliberadamente largo" })
      .eq("id", IDS.activeRound),
    "Nombrar ronda activa",
  );

  const activeReactions = [
    ["one", IDS.activeMoments[0], "fire"],
    ["many", IDS.activeMoments[0], "laugh"],
    ["zero", IDS.activeMoments[0], "cheers"],
    ["owner", IDS.activeMoments[1], "wow"],
    ["one", IDS.activeMoments[2], "cheers"],
  ];
  for (const [personKey, momentId, type] of activeReactions) {
    assertResult(
      await people[personKey].client.rpc("toggle_reaction", {
        p_moment_id: momentId,
        p_type: type,
      }),
      `Reacción única ${personKey}/${momentId}`,
    );
  }

  const activeStars = [
    ["one", IDS.activeMoments[0]],
    ["many", IDS.activeMoments[0]],
    ["zero", IDS.activeMoments[0]],
    ["owner", IDS.activeMoments[1]],
  ];
  for (const [personKey, momentId] of activeStars) {
    assertResult(
      await people[personKey].client.rpc("toggle_round_star", { p_moment_id: momentId }),
      `Estrella ${personKey}/${momentId}`,
    );
  }

  for (const [index, moment] of CLOSED_MOMENTS.entries()) {
    await uploadAndCreateMoment({
      image,
      person: people[moment.person],
      groupId: IDS.activeGroup,
      roundId: IDS.closedRound,
      moment,
      firstInRound: index === 0,
    });
  }
  assertResult(
    await admin
      .from("rounds")
      .update({ title: "Ronda cerrada · recuerdos del domingo" })
      .eq("id", IDS.closedRound),
    "Nombrar ronda cerrada",
  );

  const closedReactions = [
    ["one", IDS.closedMoments[0], "fire"],
    ["many", IDS.closedMoments[0], "cheers"],
    ["zero", IDS.closedMoments[0], "wow"],
    ["owner", IDS.closedMoments[1], "laugh"],
  ];
  for (const [personKey, momentId, type] of closedReactions) {
    assertResult(
      await people[personKey].client.rpc("toggle_reaction", {
        p_moment_id: momentId,
        p_type: type,
      }),
      `Reacción de ronda cerrable ${personKey}/${momentId}`,
    );
  }

  const closedStars = [
    ["one", IDS.closedMoments[0]],
    ["many", IDS.closedMoments[0]],
    ["zero", IDS.closedMoments[0]],
    ["owner", IDS.closedMoments[1]],
  ];
  for (const [personKey, momentId] of closedStars) {
    assertResult(
      await people[personKey].client.rpc("toggle_round_star", { p_moment_id: momentId }),
      `Estrella de ronda cerrable ${personKey}/${momentId}`,
    );
  }
  assertResult(
    await people.owner.client.rpc("close_round", { p_round_id: IDS.closedRound }),
    "Cerrar ronda por RPC",
  );

  const ownerStats = assertResult(
    await people.owner.client.rpc("get_my_profile_stats"),
    "Calcular estadísticas privadas de bebida",
  );

  const { count: outsiderVisibility, error: outsiderVisibilityError } = await people.outsider.client
    .from("rounds")
    .select("id", { count: "exact", head: true })
    .eq("group_id", IDS.activeGroup);
  if (outsiderVisibilityError) {
    throw new Error(`Comprobar aislamiento del usuario ajeno: ${outsiderVisibilityError.message}`);
  }
  const verified = await verifySeed(admin, people, ownerStats, outsiderVisibility);
  return {
    cleanup: cleanupSummary,
    users: verified.users,
    groups: verified.groups,
    memberships: verified.memberships,
    groupStates: { withActivity: 1, empty: 1 },
    rounds: verified.rounds,
    moments: {
      total: verified.moments,
      activeRound: ACTIVE_MOMENTS.length,
      closedRound: CLOSED_MOMENTS.length,
      perActiveRoundUser: { zero: 0, one: 1, many: 3 },
    },
    reactions: verified.reactions,
    stars: verified.stars,
    closedWinnerPresent: verified.closedWinnerPresent,
    privateDrinkStats: {
      totalMoments: ownerStats?.total_moments ?? null,
      withDrink: ownerStats?.total_with_drink ?? null,
      categories: Object.keys(ownerStats?.by_drink ?? {}).sort(),
    },
    outsiderMainGroupVisibleRounds: outsiderVisibility,
  };
}

function printCredentials() {
  console.log("\nCREDENCIALES LOCALES DE PRUEBA (NO USAR FUERA DE SUPABASE LOCAL)");
  console.log(`Contraseña compartida: ${PASSWORD}`);
  for (const person of PEOPLE) {
    console.log(`- ${person.key}: ${person.email}`);
  }
}

async function main() {
  if (!LOCAL_FLAG) {
    fail("Este script solo funciona en local. Usa `npm run qa:visual:seed`.");
  }

  const { apiUrl, anonKey, serviceRoleKey } = readLocalSupabaseConfig();
  const admin = makeClient(apiUrl, serviceRoleKey);

  if (CLEANUP_ONLY) {
    const summary = await cleanup(admin);
    console.log("Seed visual local eliminado.");
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const summary = await seed(admin, apiUrl, anonKey);
  console.log("Seed visual local preparado. Esto no equivale a un PASS visual.");
  console.log(JSON.stringify(summary, null, 2));
  printCredentials();
  console.log(`\nGrupo principal: ${IDS.activeGroup}`);
  console.log(`Ronda activa: ${IDS.activeRound}`);
  console.log(`Ronda cerrada: ${IDS.closedRound}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ERROR seed visual local: ${message}`);
  process.exitCode = 1;
});

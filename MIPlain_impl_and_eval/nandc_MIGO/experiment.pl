%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%  MIGO
%%  S. H. Muggleton and C. Hocquette. Machine discovery of comprehensible strategies for
%%  simple games using meta-interpretive learning.New Generation Computing, 37:203–217,2019.
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

:- ['./MIGO/migo'].
:- ['../util'].
:- [accessible_boards_1move].
:- [environment].
:- [menace].
:- [minimaxoutput].
:- [playox].

:- dynamic(counter/1).

%% ---------- LEARNING TASK ----------

%% generate random initial boards from the set of 1-move ahead positions
board(_,B):-
    all_accessible_boards(Bs),
    random_member(B,Bs).

mark(learner,o).
mark(opponent,x).
depth_game(5).

ref_counter(mixed,0).
ref_counter(separated,10).

initialisation(SwIni, SdIni, L) :-
    set_rand,
    assert_program(SwIni),
    assert_program(SdIni),
    ref_counter(L,C1),
    asserta(ref_counter(C1)),
    asserta(counter(0)),
    asserta(learning(L)).

% N number of iterations
% Learning type: mixed or separated
% SwIni, SdIni winning and drawing strategies if transfer learning
test(SwIni,SdIni,N,L,[CR1|CR_]):-
    initialisation(SwIni,SdIni,L),
    write('START'),nl,
    T1 is cputime,
    format('cpu time: ~w\n',[T1]),
    N1 is N-1,
    get_example(N1,[],[],B,O1,1),
    regret(B,O1,R),
    format('regret: ~w \n',[R]),
    retract_program(SwIni),
    retract_program(SdIni),
    dependent_learning(Sw,Sd),!,
    pprint(Sw),
    pprint(Sd),nl,
    prog_equivalent([],Sw,E),
    merge(SwIni,Sw,SwIni2),
    merge(SdIni,Sd,SdIni2),
    T2 is cputime,
    format('cpu time: ~w\n',[T2]),
    test(N1,SwIni2,SdIni2,Sw,Sd,SwF,SdF,E,[R,0],[CR1|CR_]),
    write('Sw = '), pprint(SwF), nl,
    write('Sd = '), pprint(SdF), nl,
    format('regret: ~w \n',[CR1]),
    write('end').

test(0,_,_,Sw,Sd,Sw,Sd,_,CR,CR).
test(N,SwIni,SdIni,Sw,Sd,SwF,SdF,E,[CR1|CR_In],CR_Out):-
    N1 is N-1,
    assert_program(SwIni),
    assert_program(SdIni),
    get_example(N1,Sw,Sd,B,O1,E),!,
    regret(B,O1,R),
    format('regret: ~w\n',[R]),
    retract_program(SwIni),
    retract_program(SdIni),
    dependent_learning(Sw2,Sd2),!,
    pprint(Sw2),
    pprint(Sd2),nl,
    merge(SwIni,Sw2,SwIni2),
    merge(SdIni,Sd2,SdIni2),
    prog_equivalent(Sw,Sw2,E1),
    update_counter(E1,Sw2),
    T1 is cputime,
    format('cpu time: ~w\n',[T1]),
    CR is CR1+R,
    test(N1,SwIni2,SdIni2,Sw2,Sd2,SwF,SdF,E1,[CR,CR1|CR_In],CR_Out).

regret_record(Out,MaxGames) :-
    test([],[],MaxGames,separated,CR),!,
    reverse(CR,CR_r),
    write(Out,CR_r).

goal(N) :-
    open('./output/MIGO.txt',append,Out),
    regret_record(Out,N),
    write(Out,',\n'),close(Out).

goal :- test([],[],200,separated,CR).
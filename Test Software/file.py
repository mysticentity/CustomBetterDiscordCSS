import Player

def get_names(fob)->[str]:
    illegal_player_names = {'p', 's', 'a'}
    players = []
    player_names = set()
    for line in fob:
        if line[0] != '#':
            line = line.rstrip()
            if line in illegal_player_names:
                while True:
                    print('p, s, a are not legal player names as they conflict with menu options, please restart the program with legal player names')
                    input()
                    
            players.append(Player.Player(line))
            player_names.add(line)

    if len(player_names) != len(players):
                while True:
                    print('Two players cannot have the exact same name, please fix and restart the program')
                    input()




    return players


def run_from_file(filename):
	playerdict = {}
	savefile = open(filename, 'r')
	round_num = savefile.readline().rstrip()
	round_num = int(round_num)
	playerNames = savefile.readline().rstrip().split(',')[0:-1]
	currentPlayer = ""
	entryCategory = None
	for name in playerNames:
		playerdict[name] = Player.Player(name)
	for line in savefile:
		line = line.rstrip()
		if line == "":
			pass
		elif line[0] == '%':
			currentPlayer = line[1:]
		elif line[0] == "$":
			entryCategory = line[1:]
		else:
			if entryCategory == 'wins':
				if line == "BYE":
					playerdict[currentPlayer].wins.append(line)
				else:
					playerdict[currentPlayer].wins.append(playerdict[line])
			elif entryCategory == 'losses':
				playerdict[currentPlayer].losses.append(playerdict[line])
			elif entryCategory == 'ties':
				playerdict[currentPlayer].ties.append(playerdict[line])
	
	players = playerdict.values()
	
			
		

	
if __name__ == "__main__":
    run_from_file("savefile.txt")
